import { expect, it } from "vitest";
import { splitWebsiteEvents, type WebsiteEvent } from "@/lib/hovedside/public-events";
const event:WebsiteEvent={id:"event",slug:"event",name:"Published",description:null,location:null,registration_form_url:null,starts_at:"2027-01-01T00:00Z",ends_at:"2027-01-02T00:00Z",is_active:true};
it("never lists an unpublished test event as upcoming or past",()=>{
 const result=splitWebsiteEvents([event,{...event,id:"test",name:"test",is_active:false},{...event,id:"past-test",name:"test",is_active:false,ends_at:"2025-01-01T00:00Z"}],new Date("2026-10-20T00:00Z"));
 expect(result.upcoming.map(e=>e.name)).toEqual(["Published"]);expect(result.past).toEqual([]);
});
