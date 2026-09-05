import { ExamplePreview } from './components/ExamplePreview';

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
      <figure className="example">
        <ExamplePreview />
      </figure>
      <aside className="note" aria-labelledby="note-title">
        <h2 id="note-title">A fresh start.</h2>
        <p>
          The editor is being rebuilt. For now, explore the example; image
          editing and downloads are coming next.
        </p>
      </aside>
    </main>
  );
}
