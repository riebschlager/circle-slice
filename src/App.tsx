import { Editor } from './components/Editor';

export default function App() {
  return (
    <main className="workspace">
      <header className="masthead">
        <p className="eyebrow">An experiment in circles</p>
        <h1>
          Circle Slice<span aria-hidden="true">.</span>
        </h1>
        <p className="tagline">Clip, rotate, repeat.</p>
      </header>
      <Editor />
    </main>
  );
}
