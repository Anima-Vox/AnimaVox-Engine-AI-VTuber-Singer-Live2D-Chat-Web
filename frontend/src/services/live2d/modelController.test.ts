import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Live2DStageController } from './modelController';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  addChild: vi.fn(),
  destroyApp: vi.fn(),
}));

vi.mock('pixi.js', () => ({
  Ticker: {},
  Application: class {
    view = document.createElement('canvas');
    stage = { addChild: mocks.addChild };
    renderer = { resize: vi.fn() };
    screen = { width: 800, height: 600 };
    destroy = mocks.destroyApp;
  },
}));

vi.mock('./cubismRuntime', () => ({
  importLive2DModel: async () => ({
    Live2DModel: { from: mocks.from, registerTicker: vi.fn() },
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createModel() {
  return {
    width: 100,
    height: 200,
    scale: { set: vi.fn() },
    destroy: vi.fn(),
    expression: vi.fn().mockResolvedValue(true),
    motion: vi.fn().mockResolvedValue(true),
    internalModel: {
      motionManager: {
        definitions: { idle: [] },
        expressionManager: { definitions: [{ Name: 'smile' }] },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Live2DStageController', () => {
  it('旧模型晚于新模型完成时丢弃旧结果，不覆盖或销毁新模型', async () => {
    const controller = new Live2DStageController();
    await controller.mount(document.createElement('div'));
    const slow = deferred<ReturnType<typeof createModel>>();
    const fast = deferred<ReturnType<typeof createModel>>();
    mocks.from.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    const loadingOld = controller.loadModel('/old.model3.json');
    await vi.waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(1));
    const loadingNew = controller.loadModel('/new.model3.json');
    await vi.waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));

    const newModel = createModel();
    fast.resolve(newModel);
    await loadingNew;
    const oldModel = createModel();
    slow.resolve(oldModel);
    await loadingOld;

    expect(mocks.addChild).toHaveBeenCalledExactlyOnceWith(newModel);
    expect(newModel.destroy).not.toHaveBeenCalled();
    expect(oldModel.destroy).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('舞台销毁后才完成的模型会被清理，不能重新挂到舞台', async () => {
    const controller = new Live2DStageController();
    await controller.mount(document.createElement('div'));
    const pending = deferred<ReturnType<typeof createModel>>();
    mocks.from.mockReturnValueOnce(pending.promise);
    const loading = controller.loadModel('/pending.model3.json');
    await vi.waitFor(() => expect(mocks.from).toHaveBeenCalledOnce());
    controller.destroy();
    const model = createModel();
    pending.resolve(model);
    await loading;

    expect(model.destroy).toHaveBeenCalledOnce();
    expect(mocks.addChild).not.toHaveBeenCalled();
  });

  it('可选表情或动作资源拒绝时保留模型并返回降级结果', async () => {
    const controller = new Live2DStageController();
    await controller.mount(document.createElement('div'));
    const model = createModel();
    mocks.from.mockResolvedValueOnce(model);
    await controller.loadModel('/character.model3.json');
    model.expression.mockRejectedValueOnce(new Error('missing expression'));
    model.motion.mockRejectedValueOnce(new Error('missing motion'));

    await expect(controller.applyEmotion('happy', 'smile')).resolves.toBeNull();
    await expect(controller.applyAction('idle')).resolves.toBeUndefined();
    expect(controller.hasModel).toBe(true);
    expect(model.destroy).not.toHaveBeenCalled();
    controller.destroy();
  });
});
