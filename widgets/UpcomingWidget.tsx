import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type WidgetItem = { title: string; label: string; days: number };

const UpcomingWidget = (props: { items: WidgetItem[] }) => {
  'widget';
  const items = props.items.slice(0, 3);
  return (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground('#062A2A', 'widget'), padding({ all: 12 })]}>
      <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#2FC4AE')]}>Keptly deadlines</Text>
      {items.length === 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#96B2AC')]}>Nothing due. Scan a document to track its dates.</Text>
      ) : (
        items.map((it, i) => (
          <HStack key={i}>
            <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#FFFFFF')]}>{`${it.label}: ${it.title}`}</Text>
            <Spacer />
            <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(it.days <= 7 ? '#FFA13F' : '#3DD08A')]}>
              {it.days <= 0 ? 'Today' : it.days === 1 ? '1 day' : `${it.days} days`}
            </Text>
          </HStack>
        ))
      )}
    </VStack>
  );
};

export default createWidget('UpcomingWidget', UpcomingWidget, { items: [] as WidgetItem[] });
