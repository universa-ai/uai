export function generateTuple(): [number, number] {
  const randomInt = Math.floor(Math.random() * 9) + 1;
  const firstValue = randomInt / 100;
  const secondValue = randomInt / 10;
  return [firstValue, secondValue];
}
