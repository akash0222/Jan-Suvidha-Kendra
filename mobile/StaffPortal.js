import React,{useCallback,useContext,useEffect,useMemo,useRef,useState} from "react";
import {ActivityIndicator,ScrollView,StyleSheet,Text as RNText,TextInput,TouchableOpacity,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {getIdTokenResult,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signOut} from "firebase/auth";
import {collection,doc,getDocs,limit,orderBy,query,serverTimestamp,startAfter,updateDoc} from "firebase/firestore";
import {auth,db} from "./firebase";
const STAFF_HI={
 "Verifying staff access…":"कर्मचारी प्रवेश सत्यापित किया जा रहा है…",
 "Back to citizen app":"नागरिक ऐप पर वापस जाएँ",
 "Staff sign in":"कर्मचारी लॉगिन",
 "Restricted workspace for approved staff accounts.":"केवल स्वीकृत कर्मचारियों के लिए सीमित कार्यक्षेत्र।",
 "Staff email":"कर्मचारी ईमेल",
 "Password":"पासवर्ड",
 "Enter password":"पासवर्ड दर्ज करें",
 "Sign in securely":"सुरक्षित रूप से लॉगिन करें",
 "Staff accounts are created and approved by the project administrator. Public registration is disabled.":"कर्मचारी खाते प्रोजेक्ट प्रशासक द्वारा बनाए और स्वीकृत किए जाते हैं। सार्वजनिक पंजीकरण बंद है।",
 "Staff query inbox":"कर्मचारी प्रश्न इनबॉक्स",
 "Total":"कुल",
 "Received":"प्राप्त",
 "In Review":"समीक्षाधीन",
 "In review":"समीक्षाधीन",
 "Resolved":"समाधान किया गया",
 "Rejected":"अस्वीकृत",
 "All":"सभी",
 "Search name, phone, service or reference":"नाम, फोन, सेवा या संदर्भ खोजें",
 "Refresh":"रीफ़्रेश करें",
 "Update status":"स्थिति अपडेट करें",
 "No queries found.":"कोई प्रश्न नहीं मिला।",
 "Citizen contact details are visible only to authorised staff. Handle records confidentially.":"नागरिकों की संपर्क जानकारी केवल अधिकृत कर्मचारियों को दिखाई देती है। इसे गोपनीय रखें।",
 "Date unavailable":"तारीख़ उपलब्ध नहीं",
 "Staff query inbox":"कर्मचारी प्रश्न इनबॉक्स",
 "Income Certificate":"आय प्रमाणपत्र",
 "Caste Certificate":"जाति प्रमाणपत्र",
 "Domicile / Residence Certificate":"निवास प्रमाणपत्र",
 "Birth Certificate":"जन्म प्रमाणपत्र",
 "Pension Scheme Assistance":"पेंशन योजना सहायता",
 "Ration Card Services":"राशन कार्ड सेवाएँ",
 "Scholarship Application Assistance":"छात्रवृत्ति आवेदन सहायता",
 "Utility Bill Payment Assistance":"उपयोगिता बिल भुगतान सहायता",
 "PAN Card Assistance":"PAN कार्ड सहायता",
 "Citizen service":"नागरिक सेवा",
 "Loaded":"लोड किए गए",
 "Showing the latest 100 queries. Load older records to see previous requests.":"नवीनतम 100 प्रश्न दिखाए जा रहे हैं। पुराने अनुरोध देखने के लिए आगे लोड करें।",
 "Load older queries":"पुराने प्रश्न लोड करें",
 "All loaded queries are shown.":"सभी लोड किए गए प्रश्न दिखाए जा चुके हैं।"
 "Update status":"स्थिति अपडेट करें",
 "Unable to load queries. Check Firestore rules and staff role.":"प्रश्न लोड नहीं हो सके। Firestore नियम और कर्मचारी भूमिका जाँचें।",
 "This account is not authorised for staff access.":"इस खाते को कर्मचारी प्रवेश की अनुमति नहीं है।",
 "Staff access could not be verified. Contact the project administrator.":"कर्मचारी अनुमति सत्यापित नहीं हो सकी। प्रोजेक्ट प्रशासक से संपर्क करें।",
 "Enter staff email and password.":"कर्मचारी ईमेल और पासवर्ड दर्ज करें।",
 "Sign-in failed. Check your email and password.":"लॉगिन असफल हुआ। ईमेल और पासवर्ड जाँचें।",
 "Status update failed. Check the latest Firestore rules.":"स्थिति अपडेट नहीं हुई। नवीनतम Firestore नियम जाँचें।",
 "Forgot password?":"पासवर्ड भूल गए?",
 "Enter your staff email address first.":"पहले अपना कर्मचारी ईमेल दर्ज करें।",
 "Password reset email sent. Check your inbox.":"पासवर्ड रीसेट ईमेल भेज दिया गया है। अपना इनबॉक्स देखें।",
 "Could not send a reset email. Check Firebase email settings.":"रीसेट ईमेल नहीं भेजा जा सका। Firebase ईमेल सेटिंग जाँचें।",
 "No email provided":"ईमेल उपलब्ध नहीं",
 "Name unavailable":"नाम उपलब्ध नहीं",
 "Phone unavailable":"फोन उपलब्ध नहीं",
 "Citizen service":"नागरिक सेवा",
 "CITIZEN QUERY":"नागरिक का प्रश्न",
 "Close status options":"स्थिति विकल्प बंद करें"
};
const translateStaff=(value,language)=>language==="hi"&&typeof value==="string"?(STAFF_HI[value]||value):value;
const StaffLanguageContext=React.createContext("en");
function Text({children,...props}){
 const language=useContext(StaffLanguageContext);
 const translated=React.Children.map(children,child=>typeof child==="string"?translateStaff(child,language):child);
 return <RNText {...props}>{translated}</RNText>;
}
const STATUS=["Received","In Review","Resolved","Rejected"];
const FILTERS=["All","Received","In Review","Resolved","Rejected"];
const C={green:"#123D32",mint:"#EAF3EC",bg:"#F5F7F5",white:"#FFFFFF",ink:"#172B23",muted:"#718078",line:"#E5EBE6",red:"#B42318"};
const refFor=id=>"JSK-"+String(id).slice(-8).toUpperCase();
const dateLabel=(value,language)=>{if(!value)return translateStaff("Date unavailable",language);const date=value?.toDate?value.toDate():new Date(value);return Number.isNaN(date.getTime())?translateStaff("Date unavailable",language):date.toLocaleString(language==="hi"?"hi-IN":"en-IN");};
function StaffPortalContent({onExit,language}){
 const [user,setUser]=useState(null),[checking,setChecking]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[records,setRecords]=useState([]),[loading,setLoading]=useState(false),[lastDoc,setLastDoc]=useState(null),[hasMore,setHasMore]=useState(false),[loadingMore,setLoadingMore]=useState(false),[search,setSearch]=useState(""),[filter,setFilter]=useState("All"),[open,setOpen]=useState(""),[pendingUpdate,setPendingUpdate]=useState(null),[resetNotice,setResetNotice]=useState("");
 const pendingUpdateRef=useRef(false);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const snap=await getDocs(query(collection(db,"citizenQueries"),orderBy("createdAt","desc"),limit(100)));
   setRecords(snap.docs.map(d=>({id:d.id,...d.data()})));
   setLastDoc(snap.docs.length?snap.docs[snap.docs.length-1]:null);
   setHasMore(snap.docs.length===100);
  }catch(e){
   console.warn(e?.code||e);
   setError("Unable to load queries. Check Firestore rules and staff role.");
  }finally{setLoading(false);}
 },[]);
 const loadMore=useCallback(async()=>{
  if(!lastDoc||!hasMore||loadingMore)return;
  setLoadingMore(true);setError("");
  try{
   const snap=await getDocs(query(collection(db,"citizenQueries"),orderBy("createdAt","desc"),startAfter(lastDoc),limit(100)));
   const next=snap.docs.map(d=>({id:d.id,...d.data()}));
   setRecords(current=>[...current,...next]);
   if(snap.docs.length)setLastDoc(snap.docs[snap.docs.length-1]);
   setHasMore(snap.docs.length===100);
  }catch(e){
   console.warn(e?.code||e);
   setError("Unable to load older queries. Please refresh and try again.");
  }finally{setLoadingMore(false);}
 },[lastDoc,hasMore,loadingMore]);
 const verify=useCallback(async(u)=>{if(!u){setUser(null);setRecords([]);setLastDoc(null);setHasMore(false);setSearch("");setFilter("All");setChecking(false);return;}setChecking(true);try{const token=await getIdTokenResult(u,true);if(token.claims.staff===true){setUser(u);await load();}else{await signOut(auth);setUser(null);setError("This account is not authorised for staff access.");}}catch(e){await signOut(auth).catch(()=>{});setUser(null);setError("Staff access could not be verified. Contact the project administrator.");}finally{setChecking(false);}},[load]);
 useEffect(()=>{const off=onAuthStateChanged(auth,verify);return off;},[verify]);
 const login=async()=>{if(!email.trim()||!password){setError("Enter staff email and password.");return;}setBusy(true);setError("");setResetNotice("");try{await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password);setPassword("");}catch(e){console.warn(e?.code||e);setError("Sign-in failed. Check your email and password.");}finally{setBusy(false);}};
 const resetPassword=async()=>{if(!email.trim()){setError("Enter your staff email address first.");return;}setError("");setResetNotice("");try{await sendPasswordResetEmail(auth,email.trim().toLowerCase());setResetNotice("Password reset email sent. Check your inbox.");}catch(e){console.warn(e?.code||e);setError("Could not send a reset email. Check Firebase email settings.");}};
 const update=async(item,status)=>{if(!user||pendingUpdateRef.current)return;pendingUpdateRef.current=true;setPendingUpdate({id:item.id,status});setError("");try{await updateDoc(doc(db,"citizenQueries",item.id),{status,updatedAt:serverTimestamp(),updatedBy:user.email||""});setRecords(old=>old.map(x=>x.id===item.id?{...x,status}:x));setOpen("");}catch(e){console.warn(e?.code||e);setError("Status update failed. Check the latest Firestore rules.");}finally{pendingUpdateRef.current=false;setPendingUpdate(null);}};
 const shown=useMemo(()=>records.filter(x=>(filter==="All"||(x.status||"Received")===filter)&&(!search.trim()||[x.name,x.phone,x.email,x.serviceTitle,x.message,refFor(x.id)].join(" ").toLowerCase().includes(search.trim().toLowerCase()))),[records,filter,search]);
 const count=status=>records.filter(x=>(x.status||"Received")===status).length;
 if(checking)return <View style={S.center}><ActivityIndicator color={C.green}/><Text style={S.muted}>Verifying staff access…</Text></View>;
 if(!user)return <ScrollView contentContainerStyle={S.page} keyboardShouldPersistTaps="handled"><TouchableOpacity onPress={onExit} style={S.back}><Ionicons name="arrow-back" size={18} color={C.green}/><Text style={S.heading}>Back to citizen app</Text></TouchableOpacity><View style={S.hero}><Ionicons name="shield-checkmark-outline" size={28} color="#DDEBE0"/><Text style={S.heroTitle}>Staff sign in</Text><Text style={S.heroText}>Restricted workspace for approved staff accounts.</Text></View><View style={S.card}><Text style={S.label}>Staff email</Text><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={S.input} placeholder="staff@example.com"/><Text style={S.label}>Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" style={S.input} placeholder={translateStaff("Enter password",language)}/>{error?<Text style={S.error}>{error}</Text>:null}{resetNotice?<Text style={S.notice}>{resetNotice}</Text>:null}<TouchableOpacity onPress={resetPassword} style={S.forgot}><Text style={S.forgotText}>Forgot password?</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={login} style={S.button}>{busy?<ActivityIndicator color="white"/>:<Text style={S.buttonText}>Sign in securely</Text>}</TouchableOpacity><Text style={S.note}>Staff accounts are created and approved by the project administrator. Public registration is disabled.</Text></View></ScrollView>;
 return <View style={S.screen}><View style={S.top}><TouchableOpacity onPress={async()=>{await signOut(auth);setUser(null);setRecords([]);setPassword("");setLastDoc(null);setHasMore(false);onExit();}}><Ionicons name="arrow-back" size={20} color={C.green}/></TouchableOpacity><View style={{flex:1,marginLeft:12}}><Text style={S.title}>Staff query inbox</Text><Text style={S.muted}>{user.email}</Text></View><TouchableOpacity onPress={async()=>{await signOut(auth);setUser(null);setRecords([]);setPassword("");setLastDoc(null);setHasMore(false);}}><Ionicons name="log-out-outline" size={20} color={C.green}/></TouchableOpacity></View><ScrollView contentContainerStyle={S.page}><View style={S.stats}><View style={S.stat}><Text style={S.num}>{records.length}</Text><Text style={S.muted}>Loaded</Text></View>
   <Text style={S.listHint}>Showing the latest 100 queries. Load older records to see previous requests.</Text><View style={S.stat}><Text style={S.num}>{count("Received")}</Text><Text style={S.muted}>Received</Text></View><View style={S.stat}><Text style={S.num}>{count("In Review")}</Text><Text style={S.muted}>In review</Text></View><View style={S.stat}><Text style={S.num}>{count("Resolved")}</Text><Text style={S.muted}>Resolved</Text></View><View style={S.stat}><Text style={S.num}>{count("Rejected")}</Text><Text style={S.muted}>Rejected</Text></View></View><View style={S.search}><TextInput value={search} onChangeText={setSearch} style={{flex:1}} placeholder={translateStaff("Search name, phone, service or reference",language)} autoCapitalize="none" returnKeyType="search"/><TouchableOpacity onPress={load}><Ionicons name="refresh" size={20} color={C.green}/></TouchableOpacity></View><View style={S.filterScroller}><View style={S.filterContent}>{FILTERS.map(x=><TouchableOpacity key={x} accessibilityRole="button" accessibilityState={{selected:filter===x}} onPress={()=>setFilter(x)} style={[S.chip,filter===x&&S.chipOn]}><Text style={[S.chipText,filter===x&&S.chipTextOn]}>{x}</Text></TouchableOpacity>)}</View></View>{error?<Text style={S.error}>{error}</Text>:null}{loading?<ActivityIndicator color={C.green}/>:null}{shown.map(item=><View key={item.id} style={S.record}><View style={S.recordMeta}><Text style={S.ref}>{refFor(item.id)}</Text><View style={[S.status,(item.status||"Received")==="Rejected"&&S.statusRejected,(item.status||"Received")==="Resolved"&&S.statusResolved,(item.status||"Received")==="In Review"&&S.statusReview]}><Text style={[S.statusText,(item.status||"Received")==="Rejected"&&S.statusTextRejected,(item.status||"Received")==="Resolved"&&S.statusTextResolved,(item.status||"Received")==="In Review"&&S.statusTextReview]}>{item.status||"Received"}</Text></View></View><Text style={S.date}>{dateLabel(item.createdAt,language)}</Text><Text style={S.service}>{translateStaff(item.serviceTitle||"Citizen service",language)}</Text><Text style={S.muted}>{item.name||"Name unavailable"} · {item.phone||"Phone unavailable"}{item.email?" · "+item.email:""}</Text><Text style={S.message}>{item.message}</Text><TouchableOpacity onPress={()=>setOpen(open===item.id?"":item.id)} style={S.update}><Text style={S.ref}>Update status</Text><Ionicons name="chevron-down" color={C.green}/></TouchableOpacity>{open===item.id?STATUS.map(st=><TouchableOpacity key={st} disabled={!!pendingUpdate||st===(item.status||"Received")} onPress={()=>update(item,st)} style={S.option}>{pendingUpdate?.id===item.id&&pendingUpdate?.status===st?<ActivityIndicator size="small" color={C.green}/>:<Text style={S.optionText}>{st}{st===(item.status||"Received")?" ✓":""}</Text>}</TouchableOpacity>):null}</View>)}{!loading&&!shown.length?<Text style={S.muted}>No queries found.</Text>:null}{hasMore?<TouchableOpacity disabled={loadingMore} onPress={loadMore} style={S.loadMore}>{loadingMore?<ActivityIndicator color={C.green}/>:<><Text style={S.loadMoreText}>Load older queries</Text><Ionicons name="chevron-down" size={16} color={C.green}/></>}</TouchableOpacity>:records.length>0?<Text style={S.listHint}>All loaded queries are shown.</Text>:null}<Text style={S.note}>Citizen contact details are visible only to authorised staff. Handle records confidentially.</Text></ScrollView></View>;
}
export default function StaffPortal({onExit,language="en"}){return <StaffLanguageContext.Provider value={language}><StaffPortalContent onExit={onExit} language={language}/></StaffLanguageContext.Provider>;}
const S=StyleSheet.create({screen:{flex:1,backgroundColor:C.bg},page:{padding:18,paddingBottom:35,flexGrow:1},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10},muted:{color:C.muted,fontSize:10,marginTop:3},back:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:20},heading:{color:C.green,fontWeight:"800"},hero:{backgroundColor:C.green,borderRadius:18,padding:20,marginBottom:14},heroTitle:{color:"white",fontSize:23,fontWeight:"900",marginTop:10},heroText:{color:"#DDEBE0",marginTop:6},card:{backgroundColor:"white",borderRadius:16,padding:17,borderWidth:1,borderColor:C.line},label:{color:C.ink,fontWeight:"800",marginTop:13,marginBottom:7},input:{height:46,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:12,color:C.ink},error:{color:C.red,marginTop:12},button:{height:48,backgroundColor:C.green,borderRadius:11,alignItems:"center",justifyContent:"center",marginTop:7},forgot:{alignSelf:"flex-end",paddingVertical:11},forgotText:{color:C.green,fontSize:10,fontWeight:"800"},notice:{color:C.green,fontSize:10,marginTop:8},buttonText:{color:"white",fontWeight:"900"},note:{color:C.muted,fontSize:9,lineHeight:15,marginTop:15,textAlign:"center"},top:{height:72,backgroundColor:"white",borderBottomWidth:1,borderBottomColor:C.line,paddingHorizontal:16,flexDirection:"row",alignItems:"center"},title:{color:C.ink,fontSize:17,fontWeight:"900"},stats:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:14},stat:{width:"31.5%",padding:12,backgroundColor:"white",borderRadius:13,borderWidth:1,borderColor:C.line},num:{fontSize:22,color:C.green,fontWeight:"900"},search:{height:45,backgroundColor:"white",borderRadius:11,paddingHorizontal:12,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:C.line},listHint:{color:C.muted,fontSize:9,lineHeight:14,marginTop:7,marginBottom:8},loadMore:{minHeight:43,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:"white",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginVertical:10},loadMoreText:{color:C.green,fontSize:10,fontWeight:"900"},statusRejected:{backgroundColor:"#FFF0EF"},statusTextRejected:{color:"#B42318"},statusResolved:{backgroundColor:"#EAF3EC"},statusTextResolved:{color:"#246344"},statusReview:{backgroundColor:"#FFF6E5"},statusTextReview:{color:"#94621C"},filterScroller:{marginTop:10,marginBottom:4},filterContent:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:8},chip:{minHeight:40,flexShrink:0,paddingHorizontal:15,paddingVertical:9,borderRadius:22,backgroundColor:"white",marginBottom:8,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:C.green,borderColor:C.green},chipText:{color:C.green,fontWeight:"700",fontSize:11},chipTextOn:{color:"white"},record:{backgroundColor:"white",borderRadius:14,borderWidth:1,borderColor:C.line,padding:14,marginBottom:10},recordMeta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},status:{backgroundColor:C.mint,borderRadius:18,paddingHorizontal:9,paddingVertical:5},statusText:{color:C.green,fontSize:9,fontWeight:"900"},date:{color:C.muted,fontSize:9,marginTop:5},ref:{color:C.green,fontSize:11,fontWeight:"900"},service:{color:C.ink,fontWeight:"900",fontSize:14,marginTop:8},message:{color:C.ink,fontSize:11,lineHeight:17,marginTop:10,backgroundColor:C.bg,padding:10,borderRadius:9},update:{borderTopWidth:1,borderTopColor:C.line,marginTop:12,paddingTop:10,flexDirection:"row",justifyContent:"space-between"},option:{paddingVertical:10,borderTopWidth:1,borderTopColor:C.line},optionText:{color:C.ink,fontSize:11,fontWeight:"700"}});
