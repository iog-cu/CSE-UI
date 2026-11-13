import { engine } from '../../_baseGame/engine';

const RenderPaperDollCallbackName = 'scene.RenderPaperDoll';
const DeletePaperDollCallbackName = 'scene.DeletePaperDoll';
const PauseAllPaperDollExceptCallbackName = 'scene.PauseAllPaperDollExcept';
const CycleCamerasForPaperDollCallbackName = 'scene.CycleCamerasForPaperDoll';
const SelectCameraForPaperDollCallbackName = 'scene.SelectCameraForPaperDoll';
const DragPaperDollCallbackName = 'scene.DragPaperDoll';

export interface SceneRenderFunctions {
  renderPaperDoll(character: string, classID: number, raceID: number, genderID: number, animation: string, defaultOutfit: string): void;
  deletePaperDoll(character: string): void;
  pauseAllPaperDollExcept(character: string): void;
  cycleCamerasForPaperDoll(character: string): void;
  selectCameraForPaperDoll(character: string, cameraIndex: number): void;
  dragPaperDoll(character: string, deltaX: number, deltaY: number): void;
}

class CoherentSceneRenderFunctions implements SceneRenderFunctions {
  renderPaperDoll(character: string, classID: number, raceID: number, genderID: number, animation: string, defaultOutfit: string): void {
    engine.trigger(RenderPaperDollCallbackName, character, classID, raceID, genderID, animation, defaultOutfit);
  }

  deletePaperDoll(character: string): void {
    engine.trigger(DeletePaperDollCallbackName, character);
  }

  pauseAllPaperDollExcept(character: string): void {
    engine.trigger(PauseAllPaperDollExceptCallbackName, character);
  }

  cycleCamerasForPaperDoll(character: string): void {
    engine.trigger(CycleCamerasForPaperDollCallbackName, character);
  }

  selectCameraForPaperDoll(character: string, cameraIndex: number): void {
    engine.trigger(SelectCameraForPaperDollCallbackName, character, cameraIndex);
  }

  dragPaperDoll(character: string, deltaX: number, deltaY: number): void {
    engine.trigger(DragPaperDollCallbackName, character, deltaX, deltaY);
  }
}

class BrowserSceneRenderFunctions implements SceneRenderFunctions {
  renderPaperDoll(character: string, classID: number, raceID: number, genderID: number, animation: string, defaultOutfit: string) { }
  deletePaperDoll(character: string) { }
  pauseAllPaperDollExcept(character: string) { }
  cycleCamerasForPaperDoll(character: string) { }
  selectCameraForPaperDoll(character: string, cameraIndex: number) { }
  dragPaperDoll(character: string, deltaX: number, deltaY: number) { }
}

export const impl: SceneRenderFunctions = engine.isAttached ? new CoherentSceneRenderFunctions() : new BrowserSceneRenderFunctions();
