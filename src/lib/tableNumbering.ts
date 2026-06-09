/** Chinese venues often skip table numbers containing the digit 4 (4, 14, 24, …). */
export function tableNumberContainsFour(n: number): boolean {
  return String(n).includes('4');
}

/** Map 1-based layout sequence to a display table number. */
export function sequenceToTableNumber(sequence: number, skipFour = false): number {
  if (sequence < 1) return sequence;
  if (!skipFour) return sequence;

  let count = 0;
  let n = 0;
  while (count < sequence) {
    n++;
    if (!tableNumberContainsFour(n)) {
      count++;
    }
  }
  return n;
}

export function formatTableNameFromSequence(
  sequence: number,
  template: string,
  skipFour = false,
): string {
  const n = sequenceToTableNumber(sequence, skipFour);
  return template.replace('{n}', String(n));
}

export function shouldSkipTableNumberFour(language: string): boolean {
  return language === 'zh';
}
