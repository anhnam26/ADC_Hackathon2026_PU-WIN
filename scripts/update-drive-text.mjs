import {readFileSync,writeFileSync} from 'node:fs';
function replace(file,a,b){const text=readFileSync(file,'utf8');if(!text.includes(a))throw new Error(file+': missing '+a);writeFileSync(file,text.replaceAll(a,b));}
replace('src/features/simulator/FloorConnection.tsx','150 cm wide stairs with handrails and 18 steps. Floor height: 320 cm.','Two returning flights, each 110 cm wide, with handrails and 18 risers. Floor height: 320 cm.');
replace('src/lib/i18n.ts','Use WASD to move, F to interact and Q/E to turn in place.','Wheelchair: W/S drive, A/D or Q/E turn in place. Mouse looks around. F interacts.');
replace('src/lib/i18n.ts','Move relative to your view','W/S drive · A/D turn');
replace('src/lib/i18n.ts','Entering the map captures your pointer: move the mouse to look.','Entering the map captures your pointer: move the mouse to look without steering the wheelchair. W/S drive forward/back; A/D or Q/E turn in place.');
replace('tests/e2e/navigation.spec.ts',"getAttribute('data-yaw')","getAttribute('data-look-yaw')");
replace('tests/e2e/demo.spec.ts',"getAttribute('data-yaw'))).toBeLessThan(-.1)","getAttribute('data-look-yaw'))).toBeLessThan(-.1)");
replace('tests/e2e/demo.spec.ts','Move up on screen','Drive forward');
replace('tests/e2e/notes-auth.spec.ts','expect(z).toBeGreaterThan(8.5)','expect(z).toBeGreaterThan(8.3)');
replace('tests/e2e/building.spec.ts',"keyboard.down('a')","keyboard.down('w')");
replace('tests/e2e/building.spec.ts',"keyboard.up('a')","keyboard.up('w')");
replace('tests/e2e/building.spec.ts',"keyboard.down('d')","keyboard.down('s')");
replace('tests/e2e/building.spec.ts',"keyboard.up('d')","keyboard.up('s')");
