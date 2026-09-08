import { Pendiente } from '@/scaffolding/Pendiente';
import { ES } from '@/strings';

// ⚠️ NOT A SCREEN, AND NOT THE START OF ONE. The tab exists so that the shell
// 5a-ii ships is a real shell; the screen behind it is its own plan task (5h).
// See src/scaffolding/Pendiente.tsx.
export default function Vender() {
  return <Pendiente what={ES.tabs.vender} />;
}
