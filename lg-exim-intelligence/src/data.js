const pick=(a,r)=>a[Math.floor(r()*a.length)];
const seeded=(s=24091)=>()=>((s=Math.imul(48271,s)%2147483647)&2147483647)/2147483647;
export const countries=['South Korea','China','Vietnam','Japan','Thailand','India','UAE','Germany','USA','Singapore'];
export const ports=['JNPT / Nhava Sheva','Mundra','Chennai','Delhi Air Cargo','Mumbai Air Cargo','ICD Dadri','ICD Tughlakabad'];
export const suppliers=['Seoul Micro Systems','Shenzhen Apex Components','Vina Display Tech','Osaka Motion Works','Siam Polymer Industries','Emirates Circuit Supply','Rhine Precision GmbH','Pacific Semi Corp','Lion City Packaging','HanTech Electronics'];
export const customers=['LG India Manufacturing','Nordic Home Retail','Gulf Electronics LLC','Pacific Consumer Tech','EuroVision GmbH','Metro Appliances USA'];
export const chas=['Apex Customs Services','DHL Global Forwarding','Jeena & Company','Kuehne + Nagel','Skyline Cargo Services'];
export const forwarders=['Maersk Logistics','DHL Global Forwarding','DB Schenker','Kuehne + Nagel','DSV Logistics'];
export const materials=['Electronics Components','Display Panels','Compressors','PCB','Semiconductors','Plastic Components','Motors','Packaging','Spare Parts','Finished Goods'];
export const reasons=['Supplier Delay','Documentation Issue','Vessel Delay','Port Congestion','Customs Hold','CHA Delay','Freight Forwarder Delay','Internal Approval','Incorrect HS Code','Payment Issue','Weather','Other'];
const incoterms=['FOB','CIF','EXW','FCA','DAP','DDP'];
export function generateData(n=50000){
 const r=seeded(81379), now=new Date('2026-10-06T00:00:00'); const data=[];
 for(let i=0;i<n;i++){
  const type=r()<.68?'Import':'Export', mode=r()<.24?'Air':'Sea', supplier=pick(suppliers,r), customer=pick(customers,r), mat=pick(materials,r);
  const origin=type==='Import'?pick(countries.filter(x=>x!=='India'),r):'India'; const dest=type==='Import'?'India':pick(countries.filter(x=>x!=='India'),r);
  const port=mode==='Air'?pick(['Delhi Air Cargo','Mumbai Air Cargo'],r):pick(ports.filter(x=>!x.includes('Air')),r);
  const daysAgo=Math.floor(r()*730), etd=new Date(now); etd.setDate(etd.getDate()-daysAgo);
  const transit=mode==='Air'?2+Math.floor(r()*6):16+Math.floor(r()*25); const eta=new Date(etd); eta.setDate(eta.getDate()+transit);
  const severity=r(); let delay=0, risk='On Track'; if(severity>.93){delay=6+Math.floor(r()*13);risk='Critical'} else if(severity>.80){delay=1+Math.floor(r()*5);risk='Attention'}
  const clearTat=Math.max(1,Math.round((1+r()*2+(delay?delay*.35:0)+(r()<.08?2:0))*10)/10);
  const arrival=new Date(eta);arrival.setDate(arrival.getDate()+Math.max(0,delay-2)); const clearance=new Date(arrival); clearance.setDate(clearance.getDate()+Math.ceil(clearTat));
  const weight=Math.round((mode==='Air'?60+r()*850:1200+r()*22000)); const base=mat==='Semiconductors'?16000:mat==='Display Panels'?9000:3500;
  const value=Math.round(base*(1+r()*8)*(mode==='Sea'?2.6:1)); const freight=Math.round((mode==='Air'?weight*(5.5+r()*3.5):weight*(.28+r()*.32))*(origin==='Germany'||origin==='USA'?1.22:1));
  const duty=Math.round(value*(.075+r()*.085)), detention=delay>4&&mode==='Sea'?Math.round((delay-3)*(7000+r()*9000)):0, demurrage=delay>6&&mode==='Sea'?Math.round((delay-5)*(4500+r()*6500)):0;
  const stage=pick(['Origin handling','In transit','Port arrival','Customs assessment','Factory delivery','Closed'],r);
  const status=delay>5?'Delayed':stage==='Closed'?'Cleared':stage==='Customs assessment'?'Customs Pending':stage==='Origin handling'?'Documentation Pending':'In Transit';
  data.push({Shipment_ID:`EXIM-${String(i+1).padStart(6,'0')}`,Shipment_Type:type,PO_Number:`PO-${20240000+i}`,Invoice_Number:`INV-${64000+i}`,Supplier:supplier,Customer:customer,Origin_Country:origin,Destination_Country:dest,Origin_Port:type==='Import'?`${origin} Gateway`:port,Destination_Port:type==='Import'?port:`${dest} Gateway`,Port:port,Mode:mode,BL_AWB:`${mode==='Air'?'AWB':'BL'}${87100000+i}`,Container_Number:mode==='Sea'?`LGXU${7300000+i}`:'—',Material_Category:mat,HS_Code:String(840000+Math.floor(r()*9000)),Incoterm:pick(incoterms,r),ETD:etd.toISOString().slice(0,10),ETA:eta.toISOString().slice(0,10),Actual_Arrival:arrival<=now?arrival.toISOString().slice(0,10):'',BOE_Number:type==='Import'?`BOE-${980000+i}`:'—',BOE_Date:type==='Import'?arrival.toISOString().slice(0,10):'',Shipping_Bill:type==='Export'?`SB-${450000+i}`:'—',Customs_Status:status==='Cleared'?'Cleared':status==='Customs Pending'?'Under Assessment':'Pending',CHA:pick(chas,r),Freight_Forwarder:pick(forwarders,r),Shipment_Value:value,Weight_KG:weight,Freight_Cost:freight,Customs_Duty:type==='Import'?duty:0,CHA_Charges:Math.round(4500+r()*11000),Detention_Cost:detention,Demurrage_Cost:demurrage,Clearance_Date:clearance<=now?clearance.toISOString().slice(0,10):'',Clearance_TAT:clearTat,Factory_Delivery_Date:clearance<=now?new Date(clearance.getTime()+86400000).toISOString().slice(0,10):'',Shipment_Status:status,Current_Stage:stage,Delay_Days:delay,Delay_Reason:delay?pick(reasons,r):'—',Risk_Status:risk});
 }
 return data;
}
export const fmtINR=n=> n>=1e7?`₹${(n/1e7).toFixed(1)}Cr`:n>=1e5?`₹${(n/1e5).toFixed(1)}L`:`₹${Math.round(n).toLocaleString('en-IN')}`;
