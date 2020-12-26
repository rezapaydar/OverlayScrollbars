import 'overlayscrollbars.scss';
import './index.scss';
import should from 'should';
import { waitFor } from '@testing-library/dom';
import { generateSelectCallback, iterateSelect, selectOption } from '@/testing-browser/Select';
import { timeout } from '@/testing-browser/timeout';
import { setTestResult } from '@/testing-browser/TestResult';
import { offsetSize } from 'support';

import { createTrinsicObserver } from 'observers/trinsicObserver';

const waitForOptions = {
  onTimeout(error: Error): Error {
    setTestResult(false);
    return error;
  },
};

let heightIterations = 0;
let heightIntrinsicCache: boolean;
const envElm = document.querySelector('#env');
const targetElm = document.querySelector('#target');
const checkElm = document.querySelector('#check');
const envHeightSelect: HTMLSelectElement | null = document.querySelector('#envHeight');
const targetHeightSelect: HTMLSelectElement | null = document.querySelector('#targetHeight');
const displaySelect: HTMLSelectElement | null = document.querySelector('#display');
const startBtn: HTMLButtonElement | null = document.querySelector('#start');
const changesSlot: HTMLButtonElement | null = document.querySelector('#changes');

const envElmSelectCallback = generateSelectCallback(envElm as HTMLElement);
const targetElmSelectCallback = generateSelectCallback(targetElm as HTMLElement);

envHeightSelect?.addEventListener('change', envElmSelectCallback);
targetHeightSelect?.addEventListener('change', targetElmSelectCallback);
displaySelect?.addEventListener('change', targetElmSelectCallback);

envElmSelectCallback(envHeightSelect);
targetElmSelectCallback(targetHeightSelect);
targetElmSelectCallback(displaySelect);

const iterate = async (select: HTMLSelectElement | null, afterEach?: () => any) => {
  interface IterateSelect {
    currHeightIterations: number;
    currHeightIntrinsic: boolean;
  }

  await iterateSelect<IterateSelect>(select, {
    beforeEach() {
      const currHeightIterations = heightIterations;
      const currHeightIntrinsic = offsetSize(checkElm as HTMLElement).h === 0;
      return {
        currHeightIterations,
        currHeightIntrinsic,
      };
    },
    async check({ currHeightIterations, currHeightIntrinsic }) {
      const newHeightIntrinsic = offsetSize(checkElm as HTMLElement).h === 0;
      const trinsicHeightChanged = newHeightIntrinsic !== currHeightIntrinsic;

      await waitFor(() => {
        if (trinsicHeightChanged) {
          should.equal(heightIterations, currHeightIterations + 1);
        }
      }, waitForOptions);
    },
    afterEach,
  });
};

const iterateEnvHeight = async (afterEach?: () => any) => {
  await iterate(envHeightSelect, afterEach);
};
const iterateTargetHeight = async (afterEach?: () => any) => {
  await iterate(targetHeightSelect, afterEach);
};
const changeWhileHidden = async () => {
  selectOption(targetHeightSelect as HTMLSelectElement, 'targetHeightHundred');

  const autoToHundred = async () => {
    selectOption(envHeightSelect as HTMLSelectElement, 'envHeightAuto');
    selectOption(displaySelect as HTMLSelectElement, 'displayNone');

    await timeout(250);

    selectOption(envHeightSelect as HTMLSelectElement, 'envHeightHundred');
    selectOption(displaySelect as HTMLSelectElement, 'displayBlock');

    await waitFor(() => {
      should.equal(heightIntrinsicCache, false);
    }, waitForOptions);
  };

  const hundredToAuto = async () => {
    selectOption(envHeightSelect as HTMLSelectElement, 'envHeightHundred');
    selectOption(displaySelect as HTMLSelectElement, 'displayNone');

    await timeout(250);

    selectOption(envHeightSelect as HTMLSelectElement, 'envHeightAuto');
    selectOption(displaySelect as HTMLSelectElement, 'displayBlock');

    await waitFor(() => {
      should.equal(heightIntrinsicCache, true);
    }, waitForOptions);
  };

  await autoToHundred();
  await hundredToAuto();
  await autoToHundred();
  await hundredToAuto();
};

const start = async () => {
  setTestResult(null);

  targetElm?.removeAttribute('style');
  await iterateEnvHeight();
  await iterateTargetHeight();
  await iterateEnvHeight(async () => {
    await iterateTargetHeight();
  });
  await changeWhileHidden();

  setTestResult(true);
};

startBtn?.addEventListener('click', start);

createTrinsicObserver(targetElm as HTMLElement, (widthIntrinsic: boolean, heightIntrinsic: boolean) => {
  if (heightIntrinsic !== heightIntrinsicCache) {
    heightIterations += 1;
    heightIntrinsicCache = heightIntrinsic;
  }
  requestAnimationFrame(() => {
    if (changesSlot) {
      changesSlot.textContent = heightIterations.toString();
    }
  });
});

export { start };