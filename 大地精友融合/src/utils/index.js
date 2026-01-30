import  hoverTip  from '../utils/hoverTip.js';
import httpRequest from '../utils/httpRequest.js';
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => context.querySelectorAll(selector);

export { $, $$ ,hoverTip,httpRequest} ;