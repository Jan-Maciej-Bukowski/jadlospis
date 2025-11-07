export default function log(...args) {
  if (args.length === 0) return;

  const title = args[0];          // pierwszy argument jako tytuł
  const rest = args.slice(1);     // reszta argumentów do wyświetlenia

  const stack = new Error().stack.split('\n');
  const callerInfo = stack[2]?.trim();

  const match = callerInfo?.match(/(?:\()?(.*):(\d+):(\d+)\)?$/);
  let location = 'unknown';

  if (match) {
    let [, file, line] = match;
    file = file.split('/').pop().split('?')[0];
    location = `${file}:${line}`;
  }

  // Wyświetlamy lokalizację na czerwono, tytuł na zielono, a poniżej resztę argumentów
  console.log(`%c[${location}] %c${title}`, 'color: red; font-weight: bold;', 'color: lime; font-weight: bold;');
  if (rest.length) {
    console.log(...rest);
  }
}
