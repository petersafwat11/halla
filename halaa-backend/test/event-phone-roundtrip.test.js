const test=require('node:test');const assert=require('node:assert/strict');
const { updateStep2Schema }=require('../src/modules/events/events.validation');
const { updateGuestSchema }=require('../src/modules/guests/guests.validation');
test('existing canonical Saudi contacts survive event guest/staff update validation',()=>{
 for(const phone of ['966533447741','+966 53 344 7741','0533447741','533447741']){
  assert.equal(updateStep2Schema.safeParse({guestList:[{name:'QA',phone}],staffList:[{name:'QA Staff',phone}]}).success,true,phone);
  assert.equal(updateGuestSchema.safeParse({phone}).success,true,phone);
 }
});
test('validation does not silently truncate an overlong contact into a valid number',()=>{
 for(const phone of ['053344774199','96653344774199','0533447741x']) assert.equal(updateGuestSchema.safeParse({phone}).success,false,phone);
});
