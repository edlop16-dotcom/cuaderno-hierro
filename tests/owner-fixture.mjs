// Datos ficticios. No se conectan cuentas reales.
export const OWNER_SETTINGS = {
  "owner": 1,
  "healthOk": 1,
  "planRev": 2,
  "gymRev": 1,
  "dropRev": 1,
  "barRev": 1,
  "importSym1": 1,
  "importSym2": 1,
  "importSym3": 1,
  "symDate9": 1,
  "weekFix1": 1,
  "hevyImport1": 1,
  "symImport2": 1,
  "planFix2": 1,
  "bedtime1": 1,
  "activePlanId": "plan1",
  "activeGymId": "rokaz",
  "planByGym": {
    "rokaz": "plan1"
  },
  "prof": {
    "name": "Atleta de prueba",
    "age": 31,
    "kg": 76,
    "cm": 178,
    "goal": "musculo",
    "exp": 1,
    "days": 3,
    "mins": 60,
    "equip": "gym"
  },
  "body": {
    "h": 178,
    "sex": "m",
    "w": [
      {
        "d": "2026-10-01",
        "kg": 76
      }
    ],
    "m": []
  }
};
const plans = [{"id":"plan1","name":"Full Body · 3 días","days":[{"id":"p1-lun","name":"Piernas + Torso (Pesado)","weekday":1,"exercises":[{"id":"fixture-ex-1","name":"Prensa 45°","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":120},{"id":"fixture-ex-2","name":"Sentadilla Hack","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":120},{"id":"fixture-ex-3","name":"Hip Thrust","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":90},{"id":"fixture-ex-4","name":"Press Banca Inclinado (Barra)","type":"Empuje","weight":37.5,"sets":3,"repsMin":6,"repsMax":8,"rest":120},{"id":"fixture-ex-5","name":"Remo Sentado con Cable","type":"Tracción","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":120},{"id":"fixture-ex-6","name":"Extensión de Pierna","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":14,"rest":90},{"id":"fixture-ex-42","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"fuerza"},{"id":"p1-mie","name":"Full Body (Bombeo)","weekday":3,"exercises":[{"id":"fixture-ex-7","name":"Prensa 45°","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":60},{"id":"fixture-ex-8","name":"Press Banca Plano (Barra)","type":"Empuje","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-9","name":"Jalón al Pecho","type":"Tracción","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-10","name":"Remo en Polea Baja","type":"Tracción","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-11","name":"Elevaciones Laterales","type":"Empuje","weight":37.5,"sets":3,"repsMin":15,"repsMax":20,"rest":60},{"id":"fixture-ex-12","name":"Curl Bíceps","type":"Tracción","weight":37.5,"sets":3,"repsMin":15,"repsMax":15,"rest":60},{"id":"fixture-ex-13","name":"Tríceps Polea","type":"Empuje","weight":37.5,"sets":3,"repsMin":15,"repsMax":15,"rest":60},{"id":"fixture-ex-43","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"bombeo"},{"id":"p1-vie","name":"Piernas + Torso (Pesado)","weekday":5,"exercises":[{"id":"fixture-ex-14","name":"Prensa 45°","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":120},{"id":"fixture-ex-15","name":"Sentadilla Hack","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":120},{"id":"fixture-ex-16","name":"Hip Thrust","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":90},{"id":"fixture-ex-17","name":"Press Banca Plano (Barra)","type":"Empuje","weight":37.5,"sets":3,"repsMin":6,"repsMax":8,"rest":120},{"id":"fixture-ex-18","name":"Remo con Barra","type":"Tracción","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":120},{"id":"fixture-ex-19","name":"Extensión de Pierna","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":14,"rest":90},{"id":"fixture-ex-44","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"fuerza"}],"gymId":"rokaz"},{"id":"plan2","name":"Torso / Pierna · 4 días","days":[{"id":"p2-lun","name":"Piernas (Pesado)","weekday":1,"exercises":[{"id":"fixture-ex-20","name":"Prensa 45°","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":120},{"id":"fixture-ex-21","name":"Sentadilla Hack","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":120},{"id":"fixture-ex-22","name":"Hip Thrust","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":90},{"id":"fixture-ex-23","name":"Extensión de Pierna","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":14,"rest":90},{"id":"fixture-ex-24","name":"Abducción de Cadera","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":60},{"id":"fixture-ex-45","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"fuerza"},{"id":"p2-mar","name":"Torso (Pesado)","weekday":2,"exercises":[{"id":"fixture-ex-25","name":"Press Banca Inclinado (Barra)","type":"Empuje","weight":37.5,"sets":3,"repsMin":6,"repsMax":8,"rest":120},{"id":"fixture-ex-26","name":"Remo Sentado con Cable","type":"Tracción","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":120},{"id":"fixture-ex-27","name":"Press Militar (Mancuernas)","type":"Empuje","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":90},{"id":"fixture-ex-28","name":"Jalón al Pecho","type":"Tracción","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":90},{"id":"fixture-ex-29","name":"Curl Bíceps","type":"Tracción","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":60},{"id":"fixture-ex-30","name":"Tríceps Polea","type":"Empuje","weight":37.5,"sets":3,"repsMin":8,"repsMax":10,"rest":60},{"id":"fixture-ex-46","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"fuerza"},{"id":"p2-jue","name":"Piernas (Bombeo)","weekday":4,"exercises":[{"id":"fixture-ex-31","name":"Prensa 45°","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":60},{"id":"fixture-ex-32","name":"Sentadilla Hack","type":"Piernas","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-33","name":"Hip Thrust","type":"Piernas","weight":37.5,"sets":3,"repsMin":18,"repsMax":20,"rest":60},{"id":"fixture-ex-34","name":"Extensión de Pierna","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":18,"rest":60},{"id":"fixture-ex-35","name":"Abducción de Cadera","type":"Piernas","weight":37.5,"sets":3,"repsMin":15,"repsMax":20,"rest":60},{"id":"fixture-ex-47","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"bombeo"},{"id":"p2-vie","name":"Torso (Bombeo)","weekday":5,"exercises":[{"id":"fixture-ex-36","name":"Press Banca Plano (Barra)","type":"Empuje","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-37","name":"Jalón al Pecho","type":"Tracción","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-38","name":"Elevaciones Laterales","type":"Empuje","weight":37.5,"sets":3,"repsMin":15,"repsMax":20,"rest":60},{"id":"fixture-ex-39","name":"Remo en Polea Baja","type":"Tracción","weight":37.5,"sets":3,"repsMin":12,"repsMax":15,"rest":60},{"id":"fixture-ex-40","name":"Curl Bíceps","type":"Tracción","weight":37.5,"sets":3,"repsMin":15,"repsMax":15,"rest":60},{"id":"fixture-ex-41","name":"Tríceps Polea","type":"Empuje","weight":37.5,"sets":3,"repsMin":15,"repsMax":15,"rest":60},{"id":"fixture-ex-48","name":"Curl Femoral Tumbado","type":"Piernas","weight":37.5,"sets":3,"repsMin":10,"repsMax":12,"rest":90}],"kind":"bombeo"}],"gymId":"rokaz"}];
const sessions = Array.from({ length: 12 }, (_, i) => {
 const d = plans[0].days[i % 3];
 return { id: 'fixture-session-' + i, date: new Date(Date.UTC(2026, 9, 17 - i, 16)).toISOString(), planId: 'plan1', planName: plans[0].name, dayId: d.id, dayName: d.name, gymId: 'rokaz', gymName: 'Gimnasio de prueba', kind: d.kind, durationSec: 2400 + i * 10,
  exercises: d.exercises.map((e, j) => ({ name: e.name, type: e.type, sets: Array.from({ length: 3 }, (_, k) => ({ w: 37.5 + j * 2.5, r: 12 - k, rir: 2 - k % 2 })) })) };
});
const data = { plans, sessions, gyms: [{ id: 'rokaz', name: 'Gimnasio de prueba' }, { id: 'raydac', name: 'Gimnasio secundario' }] };
export async function seedOwner(page, settings) {
 if (!settings || !settings.owner) return;
 await page.addInitScript(data => {
  if (localStorage.getItem('cdh.plans')) return;
  for (const key of ['plans','sessions','gyms']) localStorage.setItem('cdh.'+key, JSON.stringify(data[key]));
 }, data);
}
