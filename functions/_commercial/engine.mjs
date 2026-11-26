import { calculateZiwei } from '../../project/scroll/chart.mjs';

export async function calculateStoredChart(birth) {
  // The pinned browser UMD also works in Pages and the zero-dependency Node tests.
  if (!globalThis.self) globalThis.self = globalThis;
  const {default:engine}=await import('../../project/vendor/iztro-v2.6.5.min.js');
  const { status, fiveElementsClass, palaces, mutagens, timing } = calculateZiwei(birth,engine);
  if (status !== 'ready') throw new Error('Incomplete chart');
  return { status, fiveElementsClass, palaces, mutagens, timing };
}
