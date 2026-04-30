export { init, getContext } from "./init";
export type { InitOptions, SdkContext } from "./init";

export { recordProfile, findElement, type ElementProfile } from "./targeting/profile";
export { waitForElement } from "./targeting/observer";

import { init, getContext } from "./init";
export const InAppBoarding = { init, getContext };
export default InAppBoarding;
