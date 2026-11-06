import React,{useEffect,useMemo,useRef,useState} from "react";
import {SafeAreaView,View,Text,TextInput,ScrollView,TouchableOpacity,StyleSheet,StatusBar,ActivityIndicator,Alert,KeyboardAvoidingView,Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import {Ionicons} from "@expo/vector-icons";

const SERVICES=[
{id:"income",title:"Income Certificate",category:"Certificates",icon:"document-text-outline",description:"Assistance with an income certificate for education, government schemes and official purposes.",documents:["Aadhaar card","Address proof","Income proof"],time:"As per department processing"},
{id:"caste",title:"Caste Certificate",category:"Certificates",icon:"ribbon-outline",description:"Guidance for a caste certificate application and its required documentation.",documents:["Aadhaar card","Address proof","Supporting caste document"],time:"As per department processing"},
{id:"residence",title:"Domicile / Residence Certificate",category:"Certificates",icon:"home-outline",description:"Assistance with applying for a domicile or residence certificate.",documents:["Aadhaar card","Address proof","Passport-size photograph"],time:"As per department processing"},
{id:"birth",title:"Birth Certificate",category:"Certificates",icon:"calendar-outline",description:"Guidance on birth certificate registration or correction.",documents:["Hospital record, if available","Parent identity proof","Address proof"],time:"Depends on record verification"},
{id:"pension",title:"Pension Scheme Assistance",category:"Government Schemes",icon:"people-outline",description:"Guidance on pension schemes, eligibility, applications and status queries.",documents:["Aadhaar card","Bank passbook","Age or eligibility proof"],time:"As per scheme rules"},
{id:"ration",title:"Ration Card Services",category:"Government Schemes",icon:"card-outline",description:"Help with a new ration card, member addition or correction-related queries.",documents:["Family members' Aadhaar cards","Address proof","Existing ration card, if applicable"],time:"As per department processing"},
{id:"scholarship",title:"Scholarship Application Assistance",category:"Education",icon:"school-outline",description:"Guidance on scholarship eligibility, documents and application steps.",documents:["Student ID","Previous marksheet","Income certificate"],time:"As per scholarship schedule"},
{id:"bill",title:"Utility Bill Payment Assistance",category:"Utility Services",icon:"flash-outline",description:"Assistance with electricity or supported utility bill payment queries.",documents:["Consumer/account number","Latest bill"],time:"Subject to service availability"},
{id:"pan",title:"PAN Card Assistance",category:"Identity Services",icon:"id-card-outline",description:"Guidance for PAN application, correction and required documents.",documents:["Aadhaar card","Date of birth proof","Photograph and signature"],time:"As per issuing authority"}
];
const C= {green:"#123d32",green2:"#4c8069",bg:"#F6F8F5",ink:"#1B3027",muted:"#738078",line:"#E5EBE6",white:"#FFFFFF",pale:"#EAF2EB"};
// Firestore is used directly; no local API server is required for query submission.
export default function App(){
 const [tab,setTab]=useState("services"),[query,setQuery]=useState(""),[category,setCategory]=useState("All"),[selected,setSelected]=useState(null);
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[message,setMessage]=useState(""),[serviceId,setServiceId]=useState("");
 const [sending,setSending]=useState(false),[history,setHistory]=useState([]),[success,setSuccess]=useState("");
 const submittingRef=useRef(false);
 const cats=["All",...new Set(SERVICES.map(s=>s.category))];
 const filtered=useMemo(()=>SERVICES.filter(s=>(category==="All"||s.category===category)&&`${s.title} ${s.description}`.toLowerCase().includes(query.toLowerCase())),[category,query]);
 useEffect(()=>{AsyncStorage.getItem("jsk_queries").then(v=>{if(v)setHistory(JSON.parse(v))}).catch(()=>{});},[]);
 const startQuery=(s)=>{setServiceId(s.id);setSelected(null);setSuccess("");setTab("raise");};
 const submit=async()=>{
  const cleanPhone=phone.replace(/[^0-9]/g,"");
  const emailValid=!email.trim()||/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim());
  if(name.trim().length<2){Alert.alert("Name required","Please enter your full name (at least 2 characters).");return;}
  if(cleanPhone.length<10||cleanPhone.length>13){Alert.alert("Check contact number","Enter a valid phone number with 10 to 13 digits, including country code if applicable.");return;}
  if(!emailValid){Alert.alert("Check email address","Enter a valid email address or leave this field empty.");return;}
  if(!serviceId){Alert.alert("Select a service","Please choose the service you need help with.");return;}
  if(message.trim().length<10){Alert.alert("More details needed","Please describe your query in at least 10 characters.");return;}
  if(submittingRef.current)return;

  submittingRef.current=true;
  setSending(true);
  const service=SERVICES.find(s=>s.id===serviceId);
  const item={
   id:"",
   name:name.trim(),
   phone:phone.trim(),
   email:email.trim(),
   serviceId,
   serviceTitle:service?.title||"Citizen service query",
   message:message.trim(),
   status:"Received",
   createdAt:new Date().toISOString()
  };

  try{
   let docRef;
   try{
    docRef=await addDoc(collection(db,"citizenQueries"),{
     name:item.name,
     phone:item.phone,
     email:item.email,
     serviceId:item.serviceId,
     serviceTitle:item.serviceTitle,
     message:item.message,
     status:"Received",
     createdAt:serverTimestamp()
    });
   }catch(firestoreError){
    console.warn("Firestore query submission failed:",firestoreError?.code||firestoreError);
    Alert.alert("Could not submit query","Please check your internet connection and try again. If the issue continues, contact the service centre.");
    return;
   }

   // A successful Firestore write is the source of truth. A local-cache failure
   // must not tell the citizen that the submission failed or encourage a duplicate.
   item.id="JSK-"+docRef.id.slice(-8).toUpperCase();
   const next=[item,...history];
   setHistory(next);
   setSuccess(item.id);
   setName("");
   setPhone("");
   setEmail("");
   setMessage("");
   setServiceId("");
   setTab("myqueries");

   let localSaved=true;
   try{
    await AsyncStorage.setItem("jsk_queries",JSON.stringify(next));
   }catch(storageError){
    localSaved=false;
    console.warn("Query saved to Firestore, but local history could not be saved:",storageError);
   }

   Alert.alert(
    "Query submitted",
    localSaved
     ? `Your query has been received.\\n\\nReference number: ${item.id}\\nStatus: Received\\n\\nPlease keep this reference number for future communication.`
     : `Your query has been received.\\n\\nReference number: ${item.id}\\n\\nPlease keep this reference number. This device could not save a local history copy.`
   );
  }finally{
   submittingRef.current=false;
   setSending(false);
  }
 };
 const Header=()=> <View style={st.header}><View style={st.logo}><Text style={st.logoText}>JSK</Text></View><View style={{flex:1}}><Text style={st.brand}>Jan Suvidha Kendra</Text><Text style={st.subbrand}>Citizen Service Portal</Text></View><TouchableOpacity onPress={()=>setTab("myqueries")} style={st.headerIcon}><Ionicons name="receipt-outline" size={21} color={C.green}/></TouchableOpacity></View>;
 const ServiceCard=({item})=><TouchableOpacity style={st.card} onPress={()=>setSelected(item)}><View style={st.cardTop}><View style={st.serviceIcon}><Ionicons name={item.icon} size={21} color={C.green}/></View><Text style={st.tag}>{item.category}</Text></View><Text style={st.cardTitle}>{item.title}</Text><Text style={st.cardDesc} numberOfLines={3}>{item.description}</Text><View style={st.cardFoot}><Text style={st.learn}>View details</Text><Ionicons name="arrow-forward" color={C.green} size={16}/></View></TouchableOpacity>;
 return <SafeAreaView style={st.safe}><StatusBar barStyle="dark-content" backgroundColor={C.white}/><Header/>
 {selected?<ScrollView contentContainerStyle={st.page}><TouchableOpacity style={st.back} onPress={()=>setSelected(null)}><Ionicons name="arrow-back" size={18} color={C.green}/><Text style={st.backText}>All services</Text></TouchableOpacity><View style={st.detailIcon}><Ionicons name={selected.icon} size={30} color={C.green}/></View><Text style={st.tagLarge}>{selected.category}</Text><Text style={st.detailTitle}>{selected.title}</Text><Text style={st.body}>{selected.description}</Text><Text style={st.sectionLabel}>DOCUMENTS YOU MAY NEED</Text>{selected.documents.map(d=><View style={st.docRow} key={d}><Ionicons name="checkmark-circle" color={C.green2} size={18}/><Text style={st.docText}>{d}</Text></View>)}<Text style={st.sectionLabel}>PROCESSING TIME</Text><Text style={st.body}>{selected.time}. Actual requirements and timelines are determined by the relevant department.</Text><View style={st.infoBox}><View style={st.infoHeading}><Ionicons name="information-circle-outline" size={18} color={C.green}/><Text style={st.infoTitle}>Before you apply</Text></View><Text style={st.infoText}>• Keep original documents and clear copies ready.\n• Ensure the details on your documents are consistent.\n• Additional documents may be requested by the concerned authority.\n• Final eligibility, fees and approval are decided by the relevant department.</Text></View><TouchableOpacity style={st.primary} onPress={()=>startQuery(selected)}><Text style={st.primaryText}>Raise a query about this service</Text><Ionicons name="arrow-forward" color="white" size={18}/></TouchableOpacity></ScrollView>
 :tab==="services"?<ScrollView contentContainerStyle={st.page} keyboardShouldPersistTaps="handled"><View style={st.hero}><Text style={st.kicker}>CITIZEN SERVICES, MADE SIMPLE</Text><Text style={st.heroTitle}>How can we{"\n"}help you today?</Text><Text style={st.heroDesc}>Browse services, check what you may need, and send us your query.</Text></View><Text style={st.heading}>Explore services</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search for a service…" placeholderTextColor="#8A968E" style={st.search}/><ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chips}>{cats.map(c=><TouchableOpacity key={c} onPress={()=>setCategory(c)} style={[st.chip,category===c&&st.chipActive]}><Text style={[st.chipText,category===c&&st.chipTextActive]}>{c}</Text></TouchableOpacity>)}</ScrollView><Text style={st.count}>{filtered.length} services available</Text>{filtered.length?filtered.map(s=><ServiceCard key={s.id} item={s}/>):<Text style={st.empty}>No matching services found.</Text>}<View style={st.helpBox}><Text style={st.helpTitle}>Need assistance?</Text><Text style={st.body}>Send us a query and our team will guide you.</Text><TouchableOpacity style={st.outline} onPress={()=>{setServiceId("");setTab("raise")}}><Text style={st.outlineText}>Raise a query</Text></TouchableOpacity></View></ScrollView>
 :tab==="raise"?<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><ScrollView contentContainerStyle={st.page} keyboardShouldPersistTaps="handled"><Text style={st.heading}>Raise a query</Text><Text style={st.body}>Share your details and tell us how we can help. Fields marked * are required.</Text><View style={st.formNotice}><Ionicons name="shield-checkmark-outline" size={17} color={C.green}/><Text style={st.formNoticeText}>Your query is sent securely to our service database. No account or login is required.</Text></View><Text style={st.label}>Full name *</Text><TextInput value={name} onChangeText={setName} style={st.input} placeholder="Enter your name"/><Text style={st.label}>Contact number *</Text><TextInput value={phone} onChangeText={setPhone} style={st.input} keyboardType="phone-pad" maxLength={16} placeholder="Enter mobile number"/><Text style={st.helper}>Enter 10 digits, or include your country code.</Text><Text style={st.label}>Email address (optional)</Text><TextInput value={email} onChangeText={setEmail} style={st.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com"/><Text style={st.label}>Service required *</Text><View style={st.selectWrap}><ScrollView nestedScrollEnabled style={{maxHeight:160}}>{SERVICES.map(s=><TouchableOpacity key={s.id} onPress={()=>setServiceId(s.id)} style={[st.option,serviceId===s.id&&st.optionActive]}><Text style={[st.optionText,serviceId===s.id&&{color:C.green,fontWeight:"700"}]}>{s.title}</Text>{serviceId===s.id&&<Ionicons name="checkmark" color={C.green}/>}</TouchableOpacity>)}</ScrollView></View><Text style={st.label}>Describe your query *</Text><TextInput value={message} onChangeText={setMessage} style={[st.input,st.textarea]} multiline textAlignVertical="top" maxLength={1000} placeholder="Briefly tell us what help you need…"/><View style={st.counterRow}><Text style={st.disclaimer}>Do not share passwords, OTPs, bank PINs or other sensitive information.</Text><Text style={st.counter}>{message.length}/1000</Text></View><TouchableOpacity style={[st.primary,sending&&{opacity:.6}]} disabled={sending} onPress={submit}>{sending?<ActivityIndicator color="white"/>:<><Text style={st.primaryText}>Submit query</Text><Ionicons name="arrow-forward" color="white" size={18}/></>}</TouchableOpacity></ScrollView></KeyboardAvoidingView>
 :<ScrollView contentContainerStyle={st.page}><Text style={st.heading}>My queries</Text><Text style={st.body}>Your submissions saved on this device.</Text>{success?<View style={st.successBox}><View style={st.successTop}><Ionicons name="checkmark-circle" size={21} color="#23734E"/><Text style={st.successTitle}>Submission successful</Text></View><Text style={st.successText}>{success}</Text><Text style={st.successHint}>Keep your reference number for future follow-up.</Text></View>:null}{history.length?history.map(q=><View key={q.id} style={st.queryCard}><View style={st.queryRow}><Text style={st.ref}>{q.id}</Text><Text style={st.status}>{q.status}</Text></View><Text style={st.cardTitle}>{q.serviceTitle}</Text><Text style={st.cardDesc}>{q.message}</Text><Text style={st.date}>{new Date(q.createdAt).toLocaleString()}</Text></View>):<View style={st.emptyBox}><Ionicons name="receipt-outline" size={32} color={C.green2}/><Text style={st.cardTitle}>No queries yet</Text><Text style={st.body}>Your submitted queries will appear here.</Text><TouchableOpacity onPress={()=>setTab("services")}><Text style={st.learn}>Browse services →</Text></TouchableOpacity></View>}</ScrollView>}
 <View style={st.bottom}><TouchableOpacity onPress={()=>{setSelected(null);setTab("services")}} style={st.navItem}><Ionicons name="grid-outline" size={21} color={tab==="services"||selected?C.green:"#8A968E"}/><Text style={[st.navText,(tab==="services"||selected)&&st.navActive]}>Services</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setSelected(null);setServiceId("");setTab("raise")}} style={st.navItem}><Ionicons name="chatbubble-ellipses-outline" size={21} color={tab==="raise"?C.green:"#8A968E"}/><Text style={[st.navText,tab==="raise"&&st.navActive]}>Raise Query</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setSelected(null);setTab("myqueries")}} style={st.navItem}><Ionicons name="receipt-outline" size={21} color={tab==="myqueries"?C.green:"#8A968E"}/><Text style={[st.navText,tab==="myqueries"&&st.navActive]}>My Queries</Text></TouchableOpacity></View></SafeAreaView>;
}
const st=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg,paddingTop:Platform.OS==="android"?(StatusBar.currentHeight||0):0},header:{height:70,backgroundColor:C.white,paddingHorizontal:20,flexDirection:"row",alignItems:"center",gap:11,borderBottomWidth:1,borderBottomColor:C.line},logo:{width:42,height:42,borderRadius:12,backgroundColor:C.green,alignItems:"center",justifyContent:"center"},logoText:{color:"white",fontWeight:"900",fontSize:13},brand:{fontSize:14,fontWeight:"800",color:C.ink},subbrand:{fontSize:10,color:C.muted,marginTop:3},headerIcon:{padding:8},page:{padding:20,paddingBottom:35},hero:{backgroundColor:C.green,borderRadius:22,padding:24,marginBottom:25,overflow:"hidden"},kicker:{fontSize:9,letterSpacing:1.5,color:"#C5D9CA",fontWeight:"900"},heroTitle:{fontSize:31,fontWeight:"900",lineHeight:37,color:C.white,marginTop:12},heroDesc:{fontSize:12,lineHeight:19,color:"#D6E4D9",marginTop:9},heading:{fontSize:23,fontWeight:"900",color:C.ink,marginBottom:8},body:{fontSize:12,lineHeight:20,color:C.muted,marginBottom:16},search:{height:50,backgroundColor:"white",borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:14,fontSize:12,marginTop:14},chips:{marginTop:13,marginBottom:7,flexGrow:0},chip:{borderWidth:1,borderColor:C.line,borderRadius:20,paddingHorizontal:13,paddingVertical:9,marginRight:7,backgroundColor:"white"},chipActive:{backgroundColor:C.green,borderColor:C.green},chipText:{fontSize:10,color:C.muted,fontWeight:"600"},chipTextActive:{color:"white"},count:{fontSize:10,color:C.muted,marginVertical:10},card:{backgroundColor:"white",borderWidth:1,borderColor:C.line,borderRadius:17,padding:17,marginBottom:13,elevation:1,shadowColor:"#173B2C",shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:8},cardTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},serviceIcon:{width:39,height:39,borderRadius:11,backgroundColor:C.pale,alignItems:"center",justifyContent:"center"},tag:{fontSize:9,color:C.green2,backgroundColor:"#EFF5EF",paddingHorizontal:9,paddingVertical:6,borderRadius:20,overflow:"hidden"},cardTitle:{fontSize:14,fontWeight:"800",color:C.ink,marginTop:13},cardDesc:{fontSize:11,lineHeight:18,color:C.muted,marginTop:6},cardFoot:{borderTopWidth:1,borderTopColor:"#F0F2F0",marginTop:13,paddingTop:11,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},learn:{fontSize:11,fontWeight:"800",color:C.green},helpBox:{backgroundColor:"#EAF2EB",padding:18,borderRadius:12,marginTop:10},helpTitle:{fontSize:15,fontWeight:"800",color:C.green},outline:{borderWidth:1,borderColor:C.green,borderRadius:8,padding:12,alignItems:"center"},outlineText:{fontSize:12,fontWeight:"700",color:C.green},bottom:{height:74,backgroundColor:"white",borderTopWidth:1,borderTopColor:C.line,flexDirection:"row",justifyContent:"space-around",alignItems:"center"},navItem:{alignItems:"center",gap:3,minWidth:85},navText:{fontSize:9,color:"#8A968E",fontWeight:"600"},navActive:{color:C.green,fontWeight:"800"},back:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:22},backText:{fontSize:12,color:C.green,fontWeight:"700"},detailIcon:{width:58,height:58,backgroundColor:C.pale,borderRadius:15,alignItems:"center",justifyContent:"center",marginBottom:15},tagLarge:{fontSize:10,color:C.green2,fontWeight:"700"},detailTitle:{fontSize:26,fontWeight:"900",color:C.ink,marginTop:7,marginBottom:10},sectionLabel:{fontSize:10,fontWeight:"900",letterSpacing:1,color:C.green,marginTop:17,marginBottom:10},docRow:{flexDirection:"row",alignItems:"center",gap:9,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},docText:{fontSize:12,color:C.ink},primary:{backgroundColor:C.green,borderRadius:14,minHeight:52,padding:15,marginTop:20,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10},primaryText:{fontSize:12,color:"white",fontWeight:"800"},label:{fontSize:11,fontWeight:"800",color:C.ink,marginTop:16,marginBottom:7},input:{backgroundColor:"white",borderWidth:1,borderColor:C.line,borderRadius:9,padding:13,fontSize:12,color:C.ink},textarea:{height:110,paddingTop:13},selectWrap:{backgroundColor:"white",borderWidth:1,borderColor:C.line,borderRadius:9,overflow:"hidden"},option:{padding:12,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:"row",justifyContent:"space-between"},optionActive:{backgroundColor:C.pale},optionText:{fontSize:11,color:C.ink},disclaimer:{fontSize:9,color:C.muted,lineHeight:15,marginTop:12},queryCard:{backgroundColor:"white",borderWidth:1,borderColor:C.line,borderRadius:16,padding:17,marginTop:12,elevation:1,shadowColor:"#173B2C",shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:7},queryRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},ref:{fontSize:10,fontWeight:"900",color:C.green},status:{fontSize:9,color:C.green2,backgroundColor:C.pale,padding:6,borderRadius:12},date:{fontSize:9,color:C.muted,marginTop:10},empty:{fontSize:12,color:C.muted,padding:20},emptyBox:{backgroundColor:"white",borderRadius:12,alignItems:"center",padding:28,marginTop:20},infoBox:{backgroundColor:"#F0F5F0",borderRadius:11,padding:15,marginTop:18},infoHeading:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8},infoTitle:{fontSize:12,fontWeight:"800",color:C.green},infoText:{fontSize:11,lineHeight:19,color:C.muted},formNotice:{flexDirection:"row",alignItems:"flex-start",gap:9,backgroundColor:C.pale,borderRadius:10,padding:12,marginTop:8,marginBottom:5},formNoticeText:{flex:1,fontSize:10,lineHeight:16,color:C.green},helper:{fontSize:9,color:C.muted,marginTop:5},counterRow:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:8},counter:{fontSize:9,color:C.muted,marginTop:12},successBox:{backgroundColor:"#EAF5EE",borderWidth:1,borderColor:"#CDE5D4",borderRadius:12,padding:15,marginTop:10,marginBottom:10},successTop:{flexDirection:"row",alignItems:"center",gap:8},successTitle:{fontSize:13,fontWeight:"900",color:"#205C3E"},successText:{fontSize:11,lineHeight:18,color:C.ink,marginTop:9},successHint:{fontSize:10,color:C.muted,marginTop:7}});