import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useThemeColors } from '@/hooks/use-theme';

const ADD_ACTION_ICON = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAYKADAAQAAAABAAAAYAAAAACK+310AAAE2klEQVR4Ae2Z24tVVRzHv5MlZkaJdnlRjG4QplYQkUFPkV3ehKCnSvAtoujBh/4ECQRFhKgeopcgpKALhBB0eSmKHlLS6PLQjUqDblZare8+embOmb1n9vnOd7Yzc74/0Dln7/X7rZnPZ5+11llr4r8SSJwzAueP0vPhH4F3vwYO/wT88Bvw92lg5QXA+kuATVcAd24Arlw1SsW0nVXAn/8Az38MPPMRcPTnmYFNlNuU8OitwD3Xztw2d3sEJmYagl47CjzxJvDNr6Pj2roO2HcfcN2a0XPHKaNWwL9lVtj1FrD/g7mh4PB04H5g+w1zq7OUs6cJIPyHDwIvH/H92XvvBXbc5Ku3lCqdN/zH8Ml3wmf9x14H3jg23FPek8CAAI75bYedDZcCO28BVsw6jQNc5+58FfhOmEuWuqa+AK52OOG2jafvBvZsK8PVlnYZJ04CTx1q13acWvUFcKk5ymrn4uU9TGd/toH20qfAZ+U7RGKSQF8A1/nzHRyKni2iE5MEKgH8hjvbl6zJlLm9OmhcXc3tN1kY2ZUAbi90Fd+WifjLE131tvD76X0COh6Xj5RPXKJHoFpEcmOtLrjU5GqnbqK9sWy+MXbcDNx1de/11P+PHe+t/09z4B+K738fujDGbysB3NWsC4Lddk3dnclr3Anlv+HYuh7Y/R7w1S/Dd4C/Tk2/Nq5XKgHcs6mLFz4BlpUtzrpPAJ98gj/0BfBOzRzyeRnn6+Czn4vOLGHr+hy3a5WAuieYIE6WJ/XAh/VI+OlgHuHvfr++TdPVpv6a2i/l69UkzMOULmPj5V32trD7qgTwEKWMNJ3E5iJ77cpOuloUnVQCeIxICV3EAxu76GXx9FEJ4K/LY8T5jlVl8n1o83z3srjq9wXwDJfHiG2D63wGVztt48nbgdUXtm09Hu0GTsS4U3nHc8AfZWt6tuDydF1ZBTUtNYfzOfa//QiwfNnwnfF+3/8EEMP1a3tnuG2Q8BtuW/iXlUn3xe2BX8d1QAAb8ACdZ7iuVRHhv/IgcNXquu5zbWAImoqDZ7g8RuRJlhocdvjkB34zwUYBTOEZLo8ReZJVs6fWWJWrHU64j9+WYacR0pkbMwo4m8zJmSdZPEzhfn5T8InnOp9Lzax2migNXm8lYGoKD1O4n88tZe5qcmONezvcXsg33Kmk2r0eWUC7smnVlsC0VVDbxLTzEIgAD0e5SgTI6DyJEeDhKFeJABmdJzECPBzlKhEgo/MkRoCHo1wlAmR0nsQI8HCUq0SAjM6TGAEejnKVCJDReRIjwMNRrhIBMjpPYgR4OMpVIkBG50mMAA9HuUoEyOg8iRHg4ShXiQAZnScxAjwc5SoRIKPzJEaAh6NcJQJkdJ7ECPBwlKtEgIzOkxgBHo5ylQiQ0XkSI8DDUa4SATI6T2IEeDjKVSJARudJjAAPR7lKBMjoPIkR4OEoV4kAGZ0nMQI8HOUqESCj8yRGgIejXCUCZHSexAjwcJSrRICMzpMYAR6OcpUIkNF5EiPAw1GuEgEyOk9iBHg4ylUiQEbnSYwAD0e5SgTI6DyJEeDhKFeJABmdJzECPBzlKhEgo/MkRoCHo1wlAmR0nsQI8HCUq0SAjM6TGAEejnKVCJDReRIjwMNRrhIBMjpPYgR4OMpVIkBG50n8H5G/1RboxiufAAAAAElFTkSuQmCC',
};

export default function AppTabs() {
  const colors = useThemeColors();

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      labelStyle={{ selected: { color: colors.primary } }}
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          md="dashboard"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="planning">
        <NativeTabs.Trigger.Label>Planning</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
          md="calendar_month"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }}
          md="pie_chart"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="add-action"
        role="search">
        <NativeTabs.Trigger.Label hidden>Add transaction</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          renderingMode="original"
          src={ADD_ACTION_ICON}
          md="add"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
