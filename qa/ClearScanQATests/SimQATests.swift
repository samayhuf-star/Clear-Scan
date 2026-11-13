import XCTest
import StoreKitTest

/// ClearScan simulator QA (CI only, never part of a store build).
///
/// Starts a StoreKit test session from storekit/ClearScan.storekit (monthly $2.99 and
/// yearly $19.99 with 1-week free trials, lifetime $39.99), then with real taps:
///   05-paywall   all three plans with local StoreKit prices and the 7-day trial line
///   22           monthly purchase through local StoreKit (no sandbox sign-in), Settings
///                shows "ClearScan Pro is active"
///   23           Settings > Restore purchases shows "Restored"
/// Screenshots go to $SIM_QA_OUT; results to $SIM_QA_OUT/results.json.
/// Same approach as the Lulla, Scanwise and Klenzer QA hosts.
final class SimQATests: XCTestCase {
    private var session: SKTestSession?
    private var results: [[String: Any]] = []

    private var outDir: URL {
        let path = ProcessInfo.processInfo.environment["SIM_QA_OUT"] ?? "/tmp/sim-qa"
        return URL(fileURLWithPath: path, isDirectory: true)
    }

    override func setUpWithError() throws {
        continueAfterFailure = true
        try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
        startSession("setup")
    }

    private func startSession(_ tag: String) {
        let candidates: [String] = [
            ProcessInfo.processInfo.environment["STOREKIT_CONFIG"],
            Bundle(for: SimQATests.self).path(forResource: "ClearScan", ofType: "storekit"),
        ].compactMap { $0 }
        for path in candidates where FileManager.default.fileExists(atPath: path) {
            do {
                let s = try SKTestSession(contentsOf: URL(fileURLWithPath: path))
                s.resetToDefaultState()
                s.disableDialogs = true
                s.clearTransactions()
                session = s
                NSLog("[clearscan-qa] SKTestSession (\(tag)) from \(path)")
                return
            } catch {
                NSLog("[clearscan-qa] SKTestSession (\(tag)) failed for \(path): \(error)")
            }
        }
        NSLog("[clearscan-qa] no StoreKit test session (\(tag))")
    }

    // MARK: helpers

    private func shot(_ name: String) {
        let s = XCUIScreen.main.screenshot()
        try? s.pngRepresentation.write(to: outDir.appendingPathComponent("\(name).png"))
        let a = XCTAttachment(screenshot: s)
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    private func record(_ step: String, _ name: String, _ pass: Bool, _ detail: String) {
        results.append(["step": step, "name": name, "pass": pass, "detail": detail])
        if let data = try? JSONSerialization.data(withJSONObject: ["steps": results], options: [.prettyPrinted]) {
            try? data.write(to: outDir.appendingPathComponent("results.json"))
        }
        NSLog("[clearscan-qa] step \(step) \(pass ? "PASS" : "FAIL") \(name): \(detail)")
    }

    private func labelContains(_ root: XCUIApplication, _ text: String) -> XCUIElement {
        root.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    private func byId(_ root: XCUIApplication, _ id: String) -> XCUIElement {
        root.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    private func tapElement(_ el: XCUIElement) {
        if el.isHittable { el.tap() } else { el.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
    }

    private func sandboxSignInShown() -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for root in [springboard, XCUIApplication()] {
            for t in ["Sign in to Apple Account", "Sign In to Apple Account", "Sign in to the App Store"] {
                if labelContains(root, t).exists { return true }
            }
        }
        return false
    }

    private func cancelSignIn() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for root in [springboard, XCUIApplication()] {
            let b = root.buttons["Cancel"].firstMatch
            if b.exists { tapElement(b); Thread.sleep(forTimeInterval: 1); return }
        }
    }

    @discardableResult
    private func confirmLocalStoreSheet() -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for root in [XCUIApplication(), springboard] {
            for label in ["Subscribe", "Purchase", "Buy", "Confirm", "Start Free Trial", "Try It Free"] {
                let b = root.buttons[label].firstMatch
                if b.exists && b.isHittable {
                    shot("22a-local-storekit-sheet")
                    NSLog("[clearscan-qa] local StoreKit sheet: tapping \(label)")
                    b.tap()
                    Thread.sleep(forTimeInterval: 2)
                    return true
                }
            }
        }
        return false
    }

    private func txInfo(_ productId: String) -> String {
        guard let session else { return "no SKTestSession" }
        let deadline = Date().addingTimeInterval(10)
        var txs: [SKTestTransaction] = []
        while Date() < deadline {
            txs = session.allTransactions()
            if txs.contains(where: { $0.productIdentifier == productId }) { break }
            Thread.sleep(forTimeInterval: 0.5)
        }
        guard let tx = txs.filter({ $0.productIdentifier == productId })
            .sorted(by: { $0.purchaseDate > $1.purchaseDate }).first else {
            return "no local \(productId) transaction (txs=\(txs.count))"
        }
        guard let exp = tx.expirationDate else { return "local tx \(productId), no expirationDate" }
        let days = exp.timeIntervalSince(tx.purchaseDate) / 86_400
        return "local tx \(productId) expires in \(String(format: "%.1f", days))d"
    }

    private func reachHome(_ app: XCUIApplication) -> Bool {
        let home = byId(app, "home-screen")
        if home.waitForExistence(timeout: 25) { return true }
        let skip = byId(app, "onboarding-skip")
        if skip.exists { tapElement(skip) }
        else if app.buttons["Skip"].firstMatch.exists { tapElement(app.buttons["Skip"].firstMatch) }
        return home.waitForExistence(timeout: 15)
    }

    // MARK: test

    func testPaywallPurchaseAndRestore() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        var attempt = 1
        var purchased = false
        var purchaseDetail = "not attempted"
        var paywallShotTaken = false

        while attempt <= 2 && !purchased {
            if attempt == 2 {
                NSLog("[clearscan-qa] retry: new SKTestSession and relaunch")
                cancelSignIn()
                app.terminate()
                Thread.sleep(forTimeInterval: 3)
                startSession("retry")
                Thread.sleep(forTimeInterval: 3)
            }
            app.launch()
            guard reachHome(app) else {
                shot("21-home-missing-\(attempt)")
                record("05", "Home reached (attempt \(attempt))", false, "home-screen not found")
                attempt += 1
                continue
            }
            Thread.sleep(forTimeInterval: 2)
            tapElement(byId(app, "home-paywall"))
            let paywall = byId(app, "paywall-screen")
            guard paywall.waitForExistence(timeout: 15) else {
                shot("21-paywall-missing-\(attempt)")
                record("05", "Paywall opened (attempt \(attempt))", false, "paywall-screen not found")
                attempt += 1
                continue
            }
            Thread.sleep(forTimeInterval: 2)
            // Plan cards are below the fold: scroll the plan list into view.
            let lifetimeCard = byId(app, "paywall-plan-lifetime")
            let lifetimePrice = labelContains(app, "$39.99")
            _ = lifetimePrice.waitForExistence(timeout: 40)
            var swipes = 0
            while swipes < 4 && !(lifetimeCard.exists && lifetimeCard.isHittable && lifetimeCard.frame.maxY < app.frame.maxY * 0.74) {
                app.scrollViews.firstMatch.swipeUp()
                Thread.sleep(forTimeInterval: 1)
                swipes += 1
            }
            Thread.sleep(forTimeInterval: 1.5)
            let monthlyTrial = labelContains(app, "Try 7 days free, then $2.99/month")
            let yearlyTrial = labelContains(app, "Try 7 days free, then $19.99/year")
            let lifetimeLine = labelContains(app, "$39.99 one-time")
            let mOK = monthlyTrial.waitForExistence(timeout: 20)
            let yOK = yearlyTrial.exists
            let lOK = lifetimeLine.exists
            let noLifetimeTrial = !labelContains(app, "then $39.99").exists
            if !paywallShotTaken || attempt == 1 {
                shot(attempt == 1 ? "05-paywall" : "05-paywall-retry")
                paywallShotTaken = true
            }
            let paywallOK = mOK && yOK && lOK && noLifetimeTrial
            record("05", "Paywall: local StoreKit prices, 7-day trial, lifetime (attempt \(attempt))", paywallOK,
                   "monthly trial line=\(mOK) yearly trial line=\(yOK) lifetime $39.99 one-time=\(lOK) no lifetime trial=\(noLifetimeTrial) session=\(session != nil) swipes=\(swipes)")

            // Purchase monthly through local StoreKit.
            let monthlyCard = byId(app, "paywall-plan-monthly")
            guard monthlyCard.exists else {
                purchaseDetail = "attempt \(attempt): monthly plan card missing"
                attempt += 1
                continue
            }
            tapElement(monthlyCard)
            Thread.sleep(forTimeInterval: 0.8)
            tapElement(byId(app, "paywall-buy"))
            var sheet = false
            var signIn = false
            var alertLabel = ""
            let deadline = Date().addingTimeInterval(45)
            while Date() < deadline {
                if sandboxSignInShown() { signIn = true; break }
                if confirmLocalStoreSheet() { sheet = true }
                if app.alerts.firstMatch.exists { alertLabel = app.alerts.firstMatch.label; break }
                if !paywall.exists { break }
                Thread.sleep(forTimeInterval: 0.5)
            }
            if signIn {
                shot("22-purchase-FAIL-sandbox-signin-\(attempt)")
                cancelSignIn()
                purchaseDetail = "attempt \(attempt): sandbox sign-in prompt, local StoreKit not attached"
                attempt += 1
                continue
            }
            if !alertLabel.isEmpty {
                shot("22-purchase-alert-\(attempt)")
                purchaseDetail = "attempt \(attempt): app alert \(alertLabel)"
                app.alerts.firstMatch.buttons.firstMatch.tap()
                attempt += 1
                continue
            }
            let tx = txInfo("com.samayhuf.clearscan.pro.monthly")
            Thread.sleep(forTimeInterval: 2)
            // The paywall closes itself once Pro is on. Check Settings.
            if paywall.exists { tapElement(byId(app, "paywall-close")) }
            let gear = byId(app, "home-settings")
            if gear.waitForExistence(timeout: 10) { tapElement(gear) }
            let active = labelContains(app, "ClearScan Pro is active").waitForExistence(timeout: 15)
            shot("22-purchase-success")
            purchased = active && tx.hasPrefix("local tx")
            purchaseDetail = "attempt \(attempt): paywallClosed=\(!paywall.exists) localSheetShown=\(sheet) proActive=\(active); \(tx)"
            if !purchased { attempt += 1 }
        }
        record("22", "Monthly purchase through local StoreKit (no sandbox sign-in)", purchased, purchaseDetail)

        // Restore: real tap on Settings > Restore purchases.
        var restoreOK = false
        var restoreDetail = "skipped, purchase did not complete"
        if purchased {
            let row = byId(app, "settings-restore")
            if !row.exists { app.swipeUp() }
            if row.waitForExistence(timeout: 10) {
                tapElement(row)
                var signIn = false
                var alertLabel = ""
                let deadline = Date().addingTimeInterval(40)
                while Date() < deadline {
                    if sandboxSignInShown() { signIn = true; break }
                    if app.alerts.firstMatch.exists { alertLabel = app.alerts.firstMatch.label; break }
                    Thread.sleep(forTimeInterval: 0.5)
                }
                if signIn {
                    shot("23-restore-FAIL-sandbox-signin")
                    cancelSignIn()
                    restoreDetail = "sandbox sign-in prompt on restore"
                } else if !alertLabel.isEmpty {
                    shot("23-restore-success")
                    restoreOK = alertLabel.contains("Restored")
                    restoreDetail = "alert: \(alertLabel); \(txInfo("com.samayhuf.clearscan.pro.monthly"))"
                    app.alerts.firstMatch.buttons.firstMatch.tap()
                    Thread.sleep(forTimeInterval: 1)
                    let still = labelContains(app, "ClearScan Pro is active").exists
                    restoreDetail += "; proActiveAfter=\(still)"
                    restoreOK = restoreOK && still
                } else {
                    shot("23-restore-no-alert")
                    restoreDetail = "no alert within 40 s"
                }
            } else {
                shot("23-restore-missing")
                restoreDetail = "settings-restore row not found"
            }
        }
        record("23", "Restore purchases (Settings row)", restoreOK, restoreDetail)
    }
}
