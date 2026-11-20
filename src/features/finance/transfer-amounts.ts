/** Input strings stay decimal until the final amounts are rounded to cents. */
export const positiveDecimal = (value: string): number => {
  const number = Number(value.replaceAll(",", ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const calculateExchangeRate = (
  sent: string,
  received: string
): string => {
  const from = positiveDecimal(sent);
  const to = positiveDecimal(received);
  return from && to ? String(Number((to / from).toPrecision(12))) : "";
};

export const calculateReceivedAmount = (sent: string, rate: string): string => {
  const from = positiveDecimal(sent);
  const multiplier = positiveDecimal(rate);
  const received = from * multiplier;
  return from && multiplier && Number.isFinite(received)
    ? received.toFixed(2)
    : "";
};
