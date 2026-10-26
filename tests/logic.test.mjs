import assert from 'node:assert/strict';
import {cd,validNo} from '../js/util.js';
import {S,seed,setS,occupied,freeTeu,vis,alerts} from '../js/store.js';
import {submitBooking,advance,uploadDoc,reviewDoc} from '../js/actions.js';
import {DEPOTS} from '../js/config.js';

assert.equal(cd('CSQU305438'),3);assert.ok(validNo('CSQU3054383'));assert.ok(!validNo('CSQU3054380'));
setS(seed());
assert.ok(S.C.length>500);assert.ok(DEPOTS.every(d=>occupied(d.id)<=d.cap));

// Visibility: a line sees only its own containers; a transporter sees no containers.
S.session={role:'line',lineId:'maersk'};assert.ok(vis('C').length&&vis('C').every(c=>c.lineId=='maersk'));
S.session={role:'transporter',company:'Test Haulage'};assert.equal(vis('C').length,0);

// Booking rules: bad numbers rejected; confirming needs documents and capacity.
assert.match(submitBooking({service:'Depot storage',container:'BAD',depotId:'gargo',lineId:'msc',origin:'x',teu:1}).error,/not valid/);
const ok=submitBooking({service:'Depot storage',container:'CSQU3054383',depotId:'hakika',lineId:'msc',origin:'Mombasa Port (KPA)',teu:1});assert.ok(ok.ok);
assert.match(submitBooking({service:'Depot storage',container:'CSQU3054383',depotId:'hakika',lineId:'msc',origin:'x',teu:1}).error,/already/);
const ref=ok.ok,docs=S.X.filter(x=>x.bookingRef==ref);
advance(ref);assert.match(advance(ref).error,/uploaded/);
docs.forEach(d=>uploadDoc(d.id));assert.ok(advance(ref).ok);assert.match(advance(ref).error,/verified/);
docs.forEach(d=>reviewDoc(d.id,true));const before=freeTeu('hakika');assert.ok(advance(ref).ok);
assert.equal(freeTeu('hakika'),before-1);assert.ok(S.X.some(x=>x.bookingRef==ref&&x.type=='interchange'));
assert.ok(Array.isArray(alerts()));
console.log('All logic tests passed');
