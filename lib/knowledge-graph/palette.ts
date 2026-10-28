import type {NodeCategory} from './contract.ts';

/** Category colours are presentation only; provenance is always labelled in text. */
export const CATEGORY_COLOURS:Record<NodeCategory,string>={
  scenario:'#80ded1',infrastructure:'#739bff',geography:'#68c6d9',assumption:'#e4ba78',
  population:'#c49aef',result:'#8bd5a1',source:'#93a6bf',planning:'#e8a1b4',limitation:'#e4997e',
};
