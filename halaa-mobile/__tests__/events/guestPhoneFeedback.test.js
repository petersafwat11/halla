const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),babel=require('@babel/core');
test('test invitation accepts both documented local phone formats',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../components/home/TestMessageModal.js'),'utf8');
 const {code}=babel.transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
 const exports={};vm.runInNewContext(code,{exports,require:id=>id==='zod'?require('zod'):id==='react-native'?{StyleSheet:{create:x=>x}}:{}});
 const schema=exports.buildSchema(x=>x);
 for(const phoneNumber of ['0533447741','533447741']) assert.equal(schema.safeParse({phoneNumber}).success,true);
 for(const phoneNumber of ['053344774','5334477411','0433447741']) assert.equal(schema.safeParse({phoneNumber}).success,false);
});
test('canonical and locally edited guest phones have the same local display',async()=>{
 const {toLocalSaudiPhone}=await import('../../../shared/src/utils/phone.js');
 for(const phone of ['966505826384','+966505826384','505826384','0505826384','٠٥٠٥٨٢٦٣٨٤']) assert.equal(toLocalSaudiPhone(phone),'0505826384');
 assert.equal(toLocalSaudiPhone('96650582638499'),'96650582638499');
});
