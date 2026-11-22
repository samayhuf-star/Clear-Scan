// Keptly only schedules local reminders, so it must not request the
// push-notification (aps-environment) entitlement that expo-notifications adds.
const { withEntitlementsPlist } = require('expo/config-plugins');
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
