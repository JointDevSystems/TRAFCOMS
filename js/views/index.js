/** Registry mapping role and section id to view function. */
import {overview,capacity,scorecard,reports,audit} from './kma.js';
import {lineOverview,depotOverview,space,book} from './portal.js';
import {containers,bookings,documents,surveys,escalations} from './shared.js';

const sh={ct:containers,bk:bookings,doc:documents,sv:surveys,esc:escalations};
export const VIEWS={
 kma:{ov:overview,cap:capacity,score:scorecard,rep:reports,aud:audit,...sh},
 line:{ov:lineOverview,...sh},
 transporter:{ov:space,new:book,...sh},
 cfagent:{ov:space,new:book,...sh},
 depot:{ov:depotOverview,...sh}};
