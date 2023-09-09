import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import tailwindWorker from 'monaco-tailwindcss/tailwindcss.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/html/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionContributions';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hover';
import 'monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'monaco-editor/esm/vs/editor/contrib/colorPicker/browser/colorContributions';
import 'monaco-editor/esm/vs/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution';
import 'monaco-editor/esm/vs/editor/contrib/linkedEditing/browser/linkedEditing';
import { editor, languages, Range } from 'monaco-editor/esm/vs/editor/editor.api';
import { emmetHTML } from 'emmet-monaco-es';
import { configureMonacoTailwindcss } from 'monaco-tailwindcss';
import { isDev } from 'solid-js/web';

self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      case 'tailwindcss':
        return new tailwindWorker();
      default:
        return new editorWorker();
    }
  }
};

// Doesn't work in dev for some reason
if (!isDev)
  configureMonacoTailwindcss(
    {
      languages,
      editor
    } as any,
    {}
  );

emmetHTML({
  languages,
  editor,
  Range
} as any);
