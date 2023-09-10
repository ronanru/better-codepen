import {
  decode as decodeMsgPack,
  encode as encodeMsgPack,
} from '@msgpack/msgpack';
import { debounce } from '@solid-primitives/scheduled';
import { compress, decompress } from 'brotli-compress';
import esbuild from 'esbuild-wasm';
import {
  toUint8Array as decodeBase64,
  fromUint8Array as encodeBase64,
} from 'js-base64';
import prettierESTreePlugin from 'prettier/plugins/estree';
import prettierHTMLPlugin from 'prettier/plugins/html';
import prettierPostCSSPlugin from 'prettier/plugins/postcss';
import prettierTSPlugin from 'prettier/plugins/typescript';
import { format } from 'prettier/standalone';
import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { isDev } from 'solid-js/web';
import Editor from './components/editor';

enum CSSAdditions {
  None,
  Tailwind,
  Normalize,
}

type Data = {
  html: string;
  css: string;
  js: string;
  cssAdditions: CSSAdditions;
  isTypeScript: boolean;
};

const App = () => {
  const [data, setData] = createStore<Data>({
    html: '<div>HelloWorld</div>',
    css: 'div { color: red; }',
    js: 'console.log("HelloWorld")',
    cssAdditions: CSSAdditions.Tailwind,
    isTypeScript: true,
  });

  const onKeyDown = async (e: KeyboardEvent) => {
    switch (e.key) {
      case 's':
        if (e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const [html, css, js] = await Promise.all([
            format(data.html, {
              parser: 'html',
              plugins: [prettierHTMLPlugin],
            }),
            format(data.css, {
              parser: 'css',
              plugins: [prettierPostCSSPlugin],
            }),
            format(data.js, {
              parser: data.isTypeScript ? 'typescript' : 'babel',
              plugins: [prettierTSPlugin, prettierESTreePlugin],
            }),
          ]);
          setData({ html, css, js });
          updateIframe(data);
          window.history.replaceState(
            null,
            '',
            `?${encodeBase64(await compress(encodeMsgPack(data)))}`,
          );
          navigator.clipboard.writeText(location.href);
        }
    }
  };

  const [isEsbuildInitialized, setIsEsbuildInitialized] = createSignal(false);

  const [iframeSrcDoc, setIframeSrcDoc] = createSignal('' as string);

  const updateIframe = debounce(
    async (data: Data) =>
      setIframeSrcDoc(`<!DOCTYPE html>
  <html lang="en" style="height:100%">
    <head>
      <meta charset="UTF-8" />
      <title>Document</title>
      ${
        {
          [CSSAdditions.None]: '',
          [CSSAdditions.Tailwind]:
            '<script src="https://cdn.tailwindcss.com"></script>',
          [CSSAdditions.Normalize]:
            '<link rel="stylesheet" href="/modern-normalize.min.css">',
        }[data.cssAdditions]
      }
      <style>
        ${data.css}
      </style>
    </head>
    <body style="height:100%">
      ${data.html}
      <script>
        ${data.isTypeScript ? await getTranspiledJS() : data.js}
      </script>
    </body>
  </html>`),
    250,
  );

  const getTranspiledJS = async () => {
    const result = await esbuild.transform(data.js, {
      loader: 'ts',
    });
    return result.code;
  };

  createEffect(
    on(
      [
        () => data.css,
        () => data.cssAdditions,
        () => data.html,
        () => data.isTypeScript,
        () => data.js,
        isEsbuildInitialized,
      ],
      () =>
        (!data.isTypeScript || isEsbuildInitialized()) && updateIframe(data),
    ),
  );
  const [height, setHeight] = createSignal(window.innerHeight / 2 - 44);
  const [width1, setWidth1] = createSignal(window.innerWidth / 3 - 10);
  const [width2, setWidth2] = createSignal(window.innerWidth / 3 - 10);
  const [resizing, setResizing] = createSignal<null | {
    value: number;
    mode: 'vertical' | 'horizontal1' | 'horizontal2';
  }>(null);

  const onResize = () => {
    setHeight(window.innerHeight / 2 - 44);
    setWidth1(window.innerWidth / 3 - 10);
    setWidth2(window.innerWidth / 3 - 10);
    setResizing(null);
  };

  const onMouseMove = (e: MouseEvent) => {
    switch (resizing()?.mode) {
      case 'vertical':
        setHeight((oldHeight) => oldHeight + (e.clientY - resizing()!.value));
        setResizing({ value: e.clientY, mode: 'vertical' });
        break;
      case 'horizontal1':
        setWidth1((oldWidth) => oldWidth + (e.clientX - resizing()!.value));
        setResizing({ value: e.clientX, mode: 'horizontal1' });
        break;
      case 'horizontal2':
        setWidth2((oldWidth) => oldWidth - (e.clientX - resizing()!.value));
        setResizing({ value: e.clientX, mode: 'horizontal2' });
        break;
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    const targetId = (e.target as HTMLElement)?.id;
    if (targetId.includes('Resizer')) {
      switch (targetId) {
        case 'verticalResizer':
          setResizing({
            value: e.clientY,
            mode: 'vertical',
          });
          break;
        case 'horizontalResizer1':
          setResizing({
            value: e.clientX,
            mode: 'horizontal1',
          });
          break;
        case 'horizontalResizer2':
          setResizing({
            value: e.clientX,
            mode: 'horizontal2',
          });
          break;
      }
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  };
  const onMouseUp = (_: MouseEvent) => {
    setResizing(null);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  onMount(async () => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onResize);
    if (!isEsbuildInitialized())
      esbuild
        .initialize({
          wasmURL: isDev
            ? './node_modules/esbuild-wasm/esbuild.wasm'
            : './esbuild.wasm',
        })
        .then(() => setIsEsbuildInitialized(true));
    if (location.search)
      setData(
        decodeMsgPack(
          await decompress(decodeBase64(location.search.slice(1))),
        ) as Data,
      );
  });

  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('resize', onResize);
  });

  return (
    <main class="flex h-screen w-screen flex-col">
      <div class="flex">
        <Editor
          lang="html"
          value={data.html}
          onChange={(s) => setData('html', s)}
          options={[{ name: 'HTML', value: 'html' }]}
          height={height()}
          width={width1()}
        />
        <div
          class="relative h-full w-4 cursor-col-resize bg-gray-900 after:absolute after:left-1 after:top-1/2 after:h-20 after:w-2 after:-translate-y-1/2 after:transform after:rounded-full after:bg-gray-600"
          id="horizontalResizer1"
        ></div>
        <Editor
          lang="css"
          value={data.css}
          onChange={(s) => setData('css', s)}
          options={[
            { name: 'CSS', value: CSSAdditions.None },
            { name: 'CSS + modern-normalize', value: CSSAdditions.Normalize },
            { name: 'CSS + Tailwind', value: CSSAdditions.Tailwind },
          ]}
          selectedOption={data.cssAdditions}
          onSelectChange={(v) =>
            setData('cssAdditions', parseInt(v) as CSSAdditions)
          }
          height={height()}
          width={window.innerWidth - width1() - width2() - 30}
        />
        <div
          class="relative h-full w-4 cursor-col-resize bg-gray-900 after:absolute after:left-1 after:top-1/2 after:h-20 after:w-2 after:-translate-y-1/2 after:transform after:rounded-full after:bg-gray-600"
          id="horizontalResizer2"
        ></div>
        <Editor
          lang={data.isTypeScript ? 'typescript' : 'javascript'}
          value={data.js}
          onChange={(s) => setData('js', s)}
          options={[
            { name: 'TypeScript', value: 'ts' },
            { name: 'JavaScript', value: 'js' },
          ]}
          selectedOption={data.isTypeScript ? 'ts' : 'js'}
          onSelectChange={(v) => setData('isTypeScript', v === 'ts')}
          height={height()}
          width={width2()}
        />
      </div>
      <div
        class="relative h-4 w-full cursor-row-resize bg-gray-900 after:absolute after:left-1/2 after:top-1 after:h-2 after:w-20 after:-translate-x-1/2 after:transform after:rounded-full after:bg-gray-600"
        id="verticalResizer"
      ></div>
      <div class="flex-1">
        <iframe
          aria-label="Preview"
          sandbox="allow-scripts"
          srcdoc={iframeSrcDoc()}
          class="h-full w-full"
        ></iframe>
      </div>
    </main>
  );
};

export default App;
