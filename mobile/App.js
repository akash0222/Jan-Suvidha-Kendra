import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "./firebase";

const SERVICES = [
  { id:"income", title:"Income Certificate", category:"Certificates", icon:"document-text-outline", description:"Assistance with an income certificate for education, government schemes and official purposes.", documents:["Aadhaar card","Address proof","Income proof"], time:"As per department processing" },
  { id:"caste", title:"Caste Certificate", category:"Certificates", icon:"ribbon-outline", description:"Guidance for a caste certificate application and its required documentation.", documents:["Aadhaar card","Address proof","Supporting caste document"], time:"As per department processing" },
  { id:"residence", title:"Domicile / Residence Certificate", category:"Certificates", icon:"home-outline", description:"Assistance with applying for a domicile or residence certificate.", documents:["Aadhaar card","Address proof","Passport-size photograph"], time:"As per department processing" },
  { id:"birth", title:"Birth Certificate", category:"Certificates", icon:"calendar-outline", description:"Guidance on birth certificate registration or correction.", documents:["Hospital record, if available","Parent identity proof","Address proof"], time:"Depends on record verification" },
  { id:"pension", title:"Pension Scheme Assistance", category:"Government Schemes", icon:"people-outline", description:"Guidance on pension schemes, eligibility, applications and status queries.", documents:["Aadhaar card","Bank passbook","Age or eligibility proof"], time:"As per scheme rules" },
  { id:"ration", title:"Ration Card Services", category:"Government Schemes", icon:"card-outline", description:"Help with a new ration card, member addition or correction-related queries.", documents:["Family members' Aadhaar cards","Address proof","Existing ration card, if applicable"], time:"As per department processing" },
  { id:"scholarship", title:"Scholarship Application Assistance", category:"Education", icon:"school-outline", description:"Guidance on scholarship eligibility, documents and application steps.", documents:["Student ID","Previous marksheet","Income certificate"], time:"As per scholarship schedule" },
  { id:"bill", title:"Utility Bill Payment Assistance", category:"Utility Services", icon:"flash-outline", description:"Assistance with electricity or supported utility bill payment queries.", documents:["Consumer/account number","Latest bill"], time:"Subject to service availability" },
  { id:"pan", title:"PAN Card Assistance", category:"Identity Services", icon:"id-card-outline", description:"Guidance for PAN application, correction and required documents.", documents:["Aadhaar card","Date of birth proof","Photograph and signature"], time:"As per issuing authority" }
];

const C = { forest:"#123D32", green:"#2F6B50", mint:"#EAF3EC", soft:"#F2F7F3", bg:"#F5F7F5", white:"#FFFFFF", ink:"#172B23", muted:"#718078", line:"#E5EBE6", amber:"#94621C", amberBg:"#FFF6E5", red:"#B42318", redBg:"#FFF0EF" };
const CATEGORIES = ["All","Certificates","Government Schemes","Education","Utility Services","Identity Services"];

function Button({ title, onPress, loading, disabled, light, icon="arrow-forward" }) {
  return <TouchableOpacity activeOpacity={0.86} disabled={disabled || loading} onPress={onPress} style={[S.button,light && S.buttonLight,(disabled || loading) && S.disabled]}>
    {loading ? <ActivityIndicator color={light ? C.forest : C.white}/> : <><Text style={[S.buttonText,light && S.buttonTextLight]}>{title}</Text><Ionicons name={icon} size={18} color={light ? C.forest : C.white}/></>}
  </TouchableOpacity>;
}

function Field({ label, required, hint, error, children }) {
  return <View style={S.field}>
    <View style={S.fieldHeading}><Text style={S.fieldLabel}>{label}{required ? " *" : ""}</Text>{hint ? <Text style={S.fieldHint}>{hint}</Text> : null}</View>
    {children}
    {error ? <Text style={S.fieldError}>{error}</Text> : null}
  </View>;
}

export default function App() {
  const [tab,setTab] = useState("services");
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("All");
  const [selected,setSelected] = useState(null);
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [email,setEmail] = useState("");
  const [message,setMessage] = useState("");
  const [serviceId,setServiceId] = useState("");
  const [pickerOpen,setPickerOpen] = useState(false);
  const [errors,setErrors] = useState({});
  const [sending,setSending] = useState(false);
  const submittingRef = useRef(false);
  const [history,setHistory] = useState([]);
  const [success,setSuccess] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return SERVICES.filter((s) => (category === "All" || s.category === category) &&
      (!term || (s.title + " " + s.description + " " + s.category).toLowerCase().includes(term)));
  },[search,category]);
  const selectedService = SERVICES.find((s) => s.id === serviceId);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem("jsk_queries").then((value) => {
      if (alive && value) { try { setHistory(JSON.parse(value)); } catch { setHistory([]); } }
    }).catch(() => {});
    return () => { alive = false; };
  },[]);

  const goTab = (next) => { setSelected(null); setPickerOpen(false); setTab(next); };
  const startQuery = (service) => {
    setSelected(null); setServiceId(service?.id || ""); setPickerOpen(false);
    setErrors({}); setSuccess(""); setTab("raise");
  };
  const change = (setter,key) => (value) => {
    setter(value);
    if (errors[key]) setErrors((old) => ({...old,[key]:""}));
  };

  const submit = async () => {
    const digits = phone.replace(/[^0-9]/g,"");
    const nextErrors = {};
    if (name.trim().length < 2) nextErrors.name = "Enter your full name (at least 2 characters).";
    if (digits.length < 10 || digits.length > 13) nextErrors.phone = "Enter a valid number with 10 to 13 digits.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!serviceId) nextErrors.serviceId = "Choose the service you need help with.";
    if (message.trim().length < 10) nextErrors.message = "Please enter at least 10 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || submittingRef.current) return;

    submittingRef.current = true; setSending(true);
    const service = SERVICES.find((s) => s.id === serviceId);
    const entry = {
      id:"", name:name.trim(), phone:phone.trim(), email:email.trim(), serviceId,
      serviceTitle:service?.title || "Citizen service query", message:message.trim(),
      status:"Received", createdAt:new Date().toISOString()
    };
    try {
      let ref;
      try {
        ref = await addDoc(collection(db,"citizenQueries"),{
          name:entry.name, phone:entry.phone, email:entry.email, serviceId:entry.serviceId,
          serviceTitle:entry.serviceTitle, message:entry.message, status:"Received",
          createdAt:serverTimestamp()
        });
      } catch (error) {
        console.warn("Firestore submission failed:",error?.code || error);
        setErrors({submit:"We couldn't send your query. Check your internet connection and try again."});
        return;
      }
      entry.id = "JSK-" + ref.id.slice(-8).toUpperCase();
      const updated = [entry,...history];
      setHistory(updated); setSuccess(entry.id); setName(""); setPhone(""); setEmail(""); setMessage("");
      setServiceId(""); setPickerOpen(false); setErrors({}); setTab("myqueries");
      try { await AsyncStorage.setItem("jsk_queries",JSON.stringify(updated)); }
      catch (error) { console.warn("Firestore saved the query; local history was unavailable:",error); }
    } finally {
      submittingRef.current = false; setSending(false);
    }
  };

  const Header = () => <View style={S.header}>
    <View style={S.brandMark}><Text style={S.brandMarkText}>JSK</Text></View>
    <View style={S.brandCopy}><Text style={S.brandName}>Jan Suvidha Kendra</Text><Text style={S.brandCaption}>Citizen service portal</Text></View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="My queries" onPress={() => goTab("myqueries")} style={S.headerAction}>
      <Ionicons name="receipt-outline" size={20} color={C.forest}/>
    </TouchableOpacity>
  </View>;

  const ServiceCard = ({item}) => <TouchableOpacity activeOpacity={0.88} style={S.serviceCard} onPress={() => setSelected(item)}>
    <View style={S.serviceTop}><View style={S.serviceIcon}><Ionicons name={item.icon} size={22} color={C.forest}/></View><Ionicons name="arrow-forward" size={18} color="#99A69E"/></View>
    <Text style={S.serviceTitle}>{item.title}</Text>
    <Text style={S.serviceCategory}>{item.category}</Text>
    <Text numberOfLines={2} style={S.serviceDescription}>{item.description}</Text>
    <View style={S.serviceFooter}><Text style={S.serviceLink}>View details</Text><Ionicons name="chevron-forward" size={14} color={C.green}/></View>
  </TouchableOpacity>;

  const Home = () => <ScrollView contentContainerStyle={S.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={S.hero}>
      <View style={S.heroGlow}/><View style={S.heroRing}/>
      <View style={S.heroEyebrow}><View style={S.liveDot}/><Text style={S.heroEyebrowText}>YOUR LOCAL SERVICE DESK</Text></View>
      <Text style={S.heroTitle}>Simple help.{'\n'}Clear guidance.</Text>
      <Text style={S.heroDesc}>Find a citizen service, understand what you may need, and send us your query.</Text>
      <View style={S.heroStats}>
        <View><Text style={S.heroValue}>09</Text><Text style={S.heroLabel}>SERVICES</Text></View>
        <View style={S.heroDivider}/>
        <View><Text style={S.heroValue}>NO</Text><Text style={S.heroLabel}>SIGN-IN NEEDED</Text></View>
      </View>
    </View>

    <View style={S.sectionHeading}>
      <View><Text style={S.eyebrow}>GET STARTED</Text><Text style={S.sectionTitle}>Find a service</Text></View>
      <Text style={S.foundCount}>{filtered.length} found</Text>
    </View>
    <View style={S.searchBox}>
      <Ionicons name="search-outline" size={19} color="#829188"/>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search certificates, schemes..." placeholderTextColor="#97A39C" style={S.searchInput} returnKeyType="search"/>
      {search ? <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#97A39C"/></TouchableOpacity> : null}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.categories}>
      {CATEGORIES.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[S.chip,category === item && S.chipActive]}>
        <Text style={[S.chipText,category === item && S.chipTextActive]}>{item}</Text>
      </TouchableOpacity>)}
    </ScrollView>

    {filtered.length ? <View style={S.grid}>{filtered.map((item) => <ServiceCard key={item.id} item={item}/>)}</View> :
      <View style={S.empty}><Ionicons name="search-outline" size={28} color="#A3B0A8"/><Text style={S.emptyTitle}>No services found</Text><Text style={S.emptyText}>Try a different search or category.</Text><TouchableOpacity onPress={() => {setSearch("");setCategory("All");}}><Text style={S.link}>Clear filters</Text></TouchableOpacity></View>}

    <View style={S.helpBanner}>
      <View style={S.helpIcon}><Ionicons name="chatbubble-ellipses-outline" size={21} color={C.forest}/></View>
      <View style={S.helpCopy}><Text style={S.helpTitle}>Need a little help?</Text><Text style={S.helpText}>Tell us what you need and send a query.</Text></View>
      <TouchableOpacity onPress={() => startQuery()} style={S.helpAction}><Ionicons name="arrow-forward" size={18} color={C.white}/></TouchableOpacity>
    </View>
    <Text style={S.footnote}>Service information is indicative. Final requirements and approvals are decided by the relevant authority.</Text>
  </ScrollView>;

  const Details = () => <ScrollView contentContainerStyle={S.page} showsVerticalScrollIndicator={false}>
    <TouchableOpacity style={S.back} onPress={() => setSelected(null)}><Ionicons name="arrow-back" size={18} color={C.forest}/><Text style={S.backText}>All services</Text></TouchableOpacity>
    <View style={S.detailHero}>
      <View style={S.detailIcon}><Ionicons name={selected.icon} size={28} color={C.forest}/></View>
      <View style={S.detailTag}><Text style={S.detailTagText}>{selected.category}</Text></View>
      <Text style={S.detailTitle}>{selected.title}</Text><Text style={S.detailDesc}>{selected.description}</Text>
    </View>
    <View style={S.infoCard}>
      <View style={S.cardHeading}><View style={S.cardHeadingIcon}><Ionicons name="documents-outline" size={18} color={C.forest}/></View><View style={S.flex}><Text style={S.cardHeadingTitle}>Documents to prepare</Text><Text style={S.cardHeadingSub}>You may be asked for these documents</Text></View></View>
      {selected.documents.map((doc,index) => <View key={doc} style={[S.documentRow,index === selected.documents.length-1 && S.lastRow]}><Ionicons name="checkmark-circle" size={19} color={C.green}/><Text style={S.documentText}>{doc}</Text></View>)}
    </View>
    <View style={S.processingCard}><View style={S.processingIcon}><Ionicons name="time-outline" size={20} color={C.amber}/></View><View style={S.flex}><Text style={S.processingTitle}>Processing information</Text><Text style={S.processingText}>{selected.time}. Actual timelines depend on the relevant department and document verification.</Text></View></View>
    <View style={S.guidanceCard}><View style={S.guidanceHeading}><Ionicons name="information-circle-outline" size={19} color={C.forest}/><Text style={S.guidanceTitle}>Before you apply</Text></View>
      <Text style={S.guidanceText}>• Keep original documents and clear copies ready.</Text><Text style={S.guidanceText}>• Ensure the details on your documents are consistent.</Text><Text style={S.guidanceText}>• Additional documents may be requested by the concerned authority.</Text><Text style={S.guidanceText}>• Final eligibility, fees and approval are decided by the relevant department.</Text>
    </View>
    <Button title="Ask about this service" onPress={() => startQuery(selected)}/>
  </ScrollView>;

  const QueryForm = () => <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={S.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={S.intro}><Text style={S.eyebrow}>WE'RE HERE TO HELP</Text><Text style={S.pageTitle}>Raise a query</Text><Text style={S.pageSubtitle}>Share a few details and tell us what support you need.</Text></View>
      <View style={S.privacyStrip}><View style={S.privacyIcon}><Ionicons name="shield-checkmark-outline" size={18} color={C.forest}/></View><Text style={S.privacyText}>No account required. Your query is sent to our service database.</Text></View>
      <View style={S.formCard}>
        <Text style={S.formTitle}>Your details</Text>
        <Field label="Full name" required error={errors.name}><TextInput value={name} onChangeText={change(setName,"name")} style={S.input} placeholder="Enter your full name" placeholderTextColor="#9AA69F" autoCapitalize="words"/></Field>
        <Field label="Mobile number" required hint="10–13 digits" error={errors.phone}><TextInput value={phone} onChangeText={change(setPhone,"phone")} style={S.input} placeholder="Enter your contact number" placeholderTextColor="#9AA69F" keyboardType="phone-pad" maxLength={16}/></Field>
        <Field label="Email address" hint="Optional" error={errors.email}><TextInput value={email} onChangeText={change(setEmail,"email")} style={S.input} placeholder="name@example.com" placeholderTextColor="#9AA69F" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}/></Field>
      </View>
      <View style={S.formCard}>
        <Text style={S.formTitle}>How can we help?</Text>
        <Field label="Service required" required error={errors.serviceId}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPickerOpen((v) => !v)} style={[S.selectField,errors.serviceId && S.inputError]}>
            <View style={S.selectCopy}><Ionicons name={selectedService?.icon || "grid-outline"} size={18} color={selectedService ? C.forest : "#91A097"}/><Text style={[S.selectText,!selectedService && S.placeholder]}>{selectedService?.title || "Choose a service"}</Text></View>
            <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={18} color={C.muted}/>
          </TouchableOpacity>
          {pickerOpen ? <View style={S.picker}>{SERVICES.map((service) => <TouchableOpacity key={service.id} onPress={() => {setServiceId(service.id);setPickerOpen(false);setErrors((old) => ({...old,serviceId:""}));}} style={[S.pickerRow,service.id === serviceId && S.pickerActive]}><Text style={[S.pickerText,service.id === serviceId && S.pickerTextActive]}>{service.title}</Text>{service.id === serviceId ? <Ionicons name="checkmark-circle" size={18} color={C.forest}/> : null}</TouchableOpacity>)}</View> : null}
        </Field>
        <Field label="Describe your query" required hint="Minimum 10 characters" error={errors.message}><TextInput value={message} onChangeText={change(setMessage,"message")} style={[S.input,S.messageInput,errors.message && S.inputError]} placeholder="Briefly describe the assistance you need..." placeholderTextColor="#9AA69F" multiline textAlignVertical="top" maxLength={1000}/><Text style={S.counter}>{message.length}/1000</Text></Field>
      </View>
      <View style={S.sensitive}><Ionicons name="lock-closed-outline" size={16} color={C.amber}/><Text style={S.sensitiveText}>Do not share passwords, OTPs, bank PINs or other authentication secrets.</Text></View>
      {errors.submit ? <View style={S.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={C.red}/><Text style={S.errorText}>{errors.submit}</Text></View> : null}
      <Button title="Submit query" onPress={submit} loading={sending} disabled={sending}/>
      <Text style={S.formNote}>By submitting, you are asking Jan Suvidha Kendra to contact you about this query.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;

  const Queries = () => <ScrollView contentContainerStyle={S.page} showsVerticalScrollIndicator={false}>
    <View style={S.intro}><Text style={S.eyebrow}>YOUR ACTIVITY</Text><Text style={S.pageTitle}>My queries</Text><Text style={S.pageSubtitle}>Reference details for queries saved on this device.</Text></View>
    {success ? <View style={S.successCard}><View style={S.successIcon}><Ionicons name="checkmark" size={24} color={C.white}/></View><Text style={S.successEyebrow}>QUERY SUBMITTED</Text><Text style={S.successTitle}>We've received your query.</Text><Text style={S.successDesc}>Keep this reference number for future communication.</Text><View style={S.referenceBox}><Text style={S.referenceLabel}>YOUR REFERENCE NUMBER</Text><Text selectable style={S.referenceValue}>{success}</Text></View></View> : null}
    {history.length ? history.map((item) => <View key={item.id} style={S.queryCard}>
      <View style={S.queryTop}><View><Text style={S.metaLabel}>REFERENCE NUMBER</Text><Text selectable style={S.reference}>{item.id}</Text></View><View style={S.status}><View style={S.statusDot}/><Text style={S.statusText}>{item.status || "Received"}</Text></View></View>
      <Text style={S.queryService}>{item.serviceTitle}</Text><Text numberOfLines={3} style={S.queryMessage}>{item.message}</Text>
      <View style={S.queryDateRow}><Ionicons name="calendar-outline" size={14} color="#8C9991"/><Text style={S.queryDate}>{new Date(item.createdAt).toLocaleString()}</Text></View>
    </View>) : <View style={S.emptyQueries}><View style={S.emptyIcon}><Ionicons name="file-tray-outline" size={27} color={C.green}/></View><Text style={S.emptyTitle}>Nothing here yet</Text><Text style={S.emptyText}>Your submitted queries will appear here on this device.</Text><TouchableOpacity style={S.emptyAction} onPress={() => goTab("services")}><Text style={S.emptyActionText}>Explore services</Text><Ionicons name="arrow-forward" size={16} color={C.forest}/></TouchableOpacity></View>}
    <Text style={S.footnote}>Query history is stored locally on this device. It is not a live status tracker.</Text>
  </ScrollView>;

  return <SafeAreaView style={S.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={C.bg}/>
    <Header/>
    <View style={S.content}>{selected ? <Details/> : tab === "services" ? <Home/> : tab === "raise" ? <QueryForm/> : <Queries/>}</View>
    <View style={S.bottomNav}>
      <TouchableOpacity onPress={() => goTab("services")} style={S.navItem}><View style={[S.navIcon,(tab === "services" || selected) && S.navIconActive]}><Ionicons name="grid-outline" size={20} color={(tab === "services" || selected) ? C.forest : "#87938B"}/></View><Text style={[S.navLabel,(tab === "services" || selected) && S.navLabelActive]}>Services</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => startQuery()} style={S.navItem}><View style={[S.navIcon,tab === "raise" && S.navIconActive]}><Ionicons name="chatbubble-ellipses-outline" size={20} color={tab === "raise" ? C.forest : "#87938B"}/></View><Text style={[S.navLabel,tab === "raise" && S.navLabelActive]}>Raise Query</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => goTab("myqueries")} style={S.navItem}><View style={[S.navIcon,tab === "myqueries" && S.navIconActive]}><Ionicons name="receipt-outline" size={20} color={tab === "myqueries" ? C.forest : "#87938B"}/></View><Text style={[S.navLabel,tab === "myqueries" && S.navLabelActive]}>My Queries</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}

const S = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg,paddingTop:Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0},
  flex:{flex:1}, content:{flex:1},
  header:{minHeight:68,paddingHorizontal:20,flexDirection:"row",alignItems:"center",backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.line},
  brandMark:{width:42,height:42,borderRadius:14,backgroundColor:C.forest,alignItems:"center",justifyContent:"center"},
  brandMarkText:{color:C.white,fontWeight:"900",fontSize:12,letterSpacing:0.5},
  brandCopy:{flex:1,marginLeft:12},brandName:{fontSize:14,fontWeight:"900",color:C.ink,letterSpacing:-0.2},brandCaption:{fontSize:10,color:C.muted,marginTop:3},
  headerAction:{width:40,height:40,borderRadius:13,backgroundColor:C.soft,alignItems:"center",justifyContent:"center"},
  page:{paddingHorizontal:18,paddingTop:18,paddingBottom:28},
  hero:{minHeight:252,backgroundColor:C.forest,borderRadius:25,padding:23,overflow:"hidden",marginBottom:27},
  heroGlow:{position:"absolute",width:190,height:190,borderRadius:95,backgroundColor:"#245743",right:-65,top:-75,opacity:0.9},
  heroRing:{position:"absolute",width:135,height:135,borderRadius:68,borderWidth:1,borderColor:"#56836C",right:-30,bottom:-55},
  heroEyebrow:{flexDirection:"row",alignItems:"center",gap:7},
  liveDot:{width:7,height:7,borderRadius:4,backgroundColor:"#9AC5A7"},
  heroEyebrowText:{fontSize:9,letterSpacing:1.2,color:"#C7DDCD",fontWeight:"900"},
  heroTitle:{fontSize:34,lineHeight:39,fontWeight:"900",color:C.white,marginTop:24,letterSpacing:-0.8},
  heroDesc:{color:"#D5E5D9",fontSize:12,lineHeight:19,marginTop:9,maxWidth:270},
  heroStats:{flexDirection:"row",alignItems:"center",marginTop:21},
  heroValue:{color:C.white,fontSize:18,fontWeight:"900"},heroLabel:{color:"#BFD6C6",fontSize:8,letterSpacing:0.9,fontWeight:"800",marginTop:2},
  heroDivider:{width:1,height:31,backgroundColor:"#527B63",marginHorizontal:19},
  sectionHeading:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-end",marginBottom:13},
  eyebrow:{fontSize:9,color:C.green,letterSpacing:1.3,fontWeight:"900",marginBottom:5},
  sectionTitle:{fontSize:22,color:C.ink,fontWeight:"900",letterSpacing:-0.4},foundCount:{fontSize:10,fontWeight:"700",color:C.muted,paddingBottom:3},
  searchBox:{height:52,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:15,paddingHorizontal:14,flexDirection:"row",alignItems:"center"},
  searchInput:{flex:1,marginLeft:9,color:C.ink,fontSize:12,paddingVertical:0},
  categories:{paddingVertical:15,paddingRight:8},
  chip:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:22,paddingHorizontal:14,paddingVertical:9,marginRight:8},
  chipActive:{backgroundColor:C.forest,borderColor:C.forest},chipText:{fontSize:10,color:C.muted,fontWeight:"700"},chipTextActive:{color:C.white},
  grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},
  serviceCard:{width:"48.2%",minHeight:190,backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,padding:13,marginBottom:12,elevation:1,shadowColor:"#16382A",shadowOffset:{width:0,height:3},shadowOpacity:0.045,shadowRadius:7},
  serviceTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  serviceIcon:{width:42,height:42,borderRadius:14,backgroundColor:C.mint,alignItems:"center",justifyContent:"center"},
  serviceTitle:{color:C.ink,fontSize:13,lineHeight:17,fontWeight:"900",marginTop:15,minHeight:35},
  serviceCategory:{color:C.green,fontSize:9,fontWeight:"800",marginTop:3},
  serviceDescription:{color:C.muted,fontSize:9,lineHeight:14,marginTop:7,minHeight:28},
  serviceFooter:{borderTopWidth:1,borderTopColor:"#EFF2EF",marginTop:10,paddingTop:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  serviceLink:{color:C.forest,fontSize:10,fontWeight:"900"},
  empty:{backgroundColor:C.white,borderRadius:18,padding:25,alignItems:"center",marginTop:4},
  emptyTitle:{color:C.ink,fontSize:15,fontWeight:"900",marginTop:11},emptyText:{color:C.muted,fontSize:11,lineHeight:17,textAlign:"center",marginTop:5,marginBottom:12},link:{color:C.green,fontSize:11,fontWeight:"900"},
  helpBanner:{flexDirection:"row",alignItems:"center",backgroundColor:C.mint,borderRadius:18,padding:14,marginTop:8},
  helpIcon:{width:42,height:42,borderRadius:14,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
  helpCopy:{flex:1,marginLeft:12},helpTitle:{color:C.forest,fontSize:12,fontWeight:"900"},helpText:{color:C.muted,fontSize:9,marginTop:4},
  helpAction:{width:36,height:36,borderRadius:12,backgroundColor:C.forest,alignItems:"center",justifyContent:"center"},
  footnote:{color:"#929D96",fontSize:9,lineHeight:14,textAlign:"center",marginTop:20,paddingHorizontal:8},
  bottomNav:{height:76,paddingHorizontal:12,flexDirection:"row",alignItems:"center",justifyContent:"space-around",backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line},
  navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:4},
  navIcon:{width:48,height:31,borderRadius:12,alignItems:"center",justifyContent:"center"},
  navIconActive:{backgroundColor:C.mint},navLabel:{fontSize:9,color:"#87938B",fontWeight:"700"},navLabelActive:{color:C.forest,fontWeight:"900"},
  back:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:16,alignSelf:"flex-start",paddingVertical:7,paddingRight:12},
  backText:{color:C.forest,fontSize:11,fontWeight:"800"},
  detailHero:{backgroundColor:C.forest,borderRadius:22,padding:21,marginBottom:14},
  detailIcon:{width:52,height:52,borderRadius:16,backgroundColor:"#DDEBE0",alignItems:"center",justifyContent:"center",marginBottom:16},
  detailTag:{alignSelf:"flex-start",backgroundColor:"#285641",borderRadius:20,paddingHorizontal:10,paddingVertical:6},
  detailTagText:{color:"#D8E8DC",fontSize:9,fontWeight:"800"},
  detailTitle:{color:C.white,fontSize:25,lineHeight:31,fontWeight:"900",marginTop:13,letterSpacing:-0.5},
  detailDesc:{color:"#D2E2D7",fontSize:11,lineHeight:18,marginTop:8},
  infoCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:18,padding:17,marginBottom:12},
  cardHeading:{flexDirection:"row",alignItems:"center",marginBottom:10},
  cardHeadingIcon:{width:37,height:37,backgroundColor:C.mint,borderRadius:12,alignItems:"center",justifyContent:"center",marginRight:10},
  cardHeadingTitle:{color:C.ink,fontSize:13,fontWeight:"900"},cardHeadingSub:{color:C.muted,fontSize:9,marginTop:3},
  flex:{flex:1},
  documentRow:{flexDirection:"row",gap:9,alignItems:"center",paddingVertical:11,borderTopWidth:1,borderTopColor:"#F0F3F0"},
  lastRow:{paddingBottom:2},documentText:{color:C.ink,fontSize:11,flex:1},
  processingCard:{flexDirection:"row",gap:11,backgroundColor:C.amberBg,borderRadius:16,padding:14,marginBottom:12},
  processingIcon:{width:36,height:36,borderRadius:12,backgroundColor:"#FFE9BF",alignItems:"center",justifyContent:"center"},
  processingTitle:{color:"#7A5214",fontSize:11,fontWeight:"900",marginTop:2},processingText:{color:"#896B3C",fontSize:10,lineHeight:16,marginTop:4},
  guidanceCard:{backgroundColor:C.soft,borderRadius:16,padding:16,marginBottom:5},
  guidanceHeading:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:9},guidanceTitle:{color:C.forest,fontSize:12,fontWeight:"900"},
  guidanceText:{color:"#64736A",fontSize:10,lineHeight:17,marginTop:4},
  button:{minHeight:52,backgroundColor:C.forest,borderRadius:14,paddingHorizontal:17,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,marginTop:14},
  buttonLight:{backgroundColor:C.mint},disabled:{opacity:0.55},buttonText:{color:C.white,fontSize:11,fontWeight:"900"},buttonTextLight:{color:C.forest},
  intro:{marginBottom:17},pageTitle:{color:C.ink,fontSize:26,lineHeight:32,fontWeight:"900",letterSpacing:-0.6},
  pageSubtitle:{color:C.muted,fontSize:11,lineHeight:18,marginTop:6},
  privacyStrip:{flexDirection:"row",alignItems:"center",backgroundColor:C.mint,borderRadius:14,padding:12,marginBottom:14},
  privacyIcon:{width:32,height:32,borderRadius:10,backgroundColor:C.white,alignItems:"center",justifyContent:"center",marginRight:10},
  privacyText:{color:C.forest,fontSize:10,lineHeight:16,flex:1,fontWeight:"600"},
  formCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:18,padding:16,marginBottom:13},
  formTitle:{color:C.ink,fontSize:13,fontWeight:"900",marginBottom:3},
  field:{marginTop:13},fieldHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:7},
  fieldLabel:{color:C.ink,fontSize:10,fontWeight:"900"},fieldHint:{color:"#96A29A",fontSize:9},
  input:{minHeight:47,backgroundColor:"#FBFCFB",borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:13,paddingVertical:11,color:C.ink,fontSize:11},
  inputError:{borderColor:"#E7A6A2",backgroundColor:C.redBg},fieldError:{color:C.red,fontSize:9,marginTop:5,lineHeight:14},
  selectField:{minHeight:49,backgroundColor:"#FBFCFB",borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  selectCopy:{flexDirection:"row",alignItems:"center",flex:1},selectText:{color:C.ink,fontSize:11,fontWeight:"700",marginLeft:9,flex:1},placeholder:{color:"#97A39B",fontWeight:"500"},
  picker:{borderWidth:1,borderColor:C.line,borderRadius:12,marginTop:7,overflow:"hidden",backgroundColor:C.white},
  pickerRow:{minHeight:43,paddingHorizontal:12,paddingVertical:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#F0F3F0"},
  pickerActive:{backgroundColor:C.mint},pickerText:{color:C.ink,fontSize:10,flex:1},pickerTextActive:{color:C.forest,fontWeight:"900"},
  messageInput:{minHeight:112,paddingTop:12},counter:{color:"#98A39C",fontSize:9,textAlign:"right",marginTop:5},
  sensitive:{flexDirection:"row",alignItems:"flex-start",gap:8,paddingHorizontal:3,marginTop:1,marginBottom:8},
  sensitiveText:{color:"#896B3C",fontSize:9,lineHeight:15,flex:1},
  errorBanner:{flexDirection:"row",gap:8,alignItems:"center",backgroundColor:C.redBg,borderRadius:12,padding:12,marginTop:6},
  errorText:{color:C.red,fontSize:10,lineHeight:15,flex:1},formNote:{color:"#929D96",fontSize:9,lineHeight:14,textAlign:"center",marginTop:12},
  successCard:{backgroundColor:C.forest,borderRadius:20,padding:19,marginBottom:14},
  successIcon:{width:42,height:42,borderRadius:14,backgroundColor:"#3F7C59",alignItems:"center",justifyContent:"center",marginBottom:14},
  successEyebrow:{color:"#BBD8C4",fontSize:9,letterSpacing:1.2,fontWeight:"900"},
  successTitle:{color:C.white,fontSize:19,fontWeight:"900",marginTop:7},
  successDesc:{color:"#D3E4D9",fontSize:10,lineHeight:16,marginTop:6},
  referenceBox:{backgroundColor:"#234F3B",borderRadius:13,padding:13,marginTop:16},
  referenceLabel:{color:"#BBD8C4",fontSize:8,letterSpacing:1,fontWeight:"900"},
  referenceValue:{color:C.white,fontSize:18,fontWeight:"900",letterSpacing:1.4,marginTop:6},
  queryCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:17,padding:16,marginBottom:11},
  queryTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  metaLabel:{color:"#95A199",fontSize:8,letterSpacing:0.9,fontWeight:"900"},
  reference:{color:C.forest,fontSize:12,fontWeight:"900",marginTop:4,letterSpacing:0.6},
  status:{flexDirection:"row",alignItems:"center",backgroundColor:C.mint,borderRadius:20,paddingHorizontal:9,paddingVertical:6,gap:5},
  statusDot:{width:6,height:6,borderRadius:3,backgroundColor:C.green},statusText:{color:C.green,fontSize:9,fontWeight:"900"},
  queryService:{color:C.ink,fontSize:13,fontWeight:"900",marginTop:13},
  queryMessage:{color:C.muted,fontSize:10,lineHeight:16,marginTop:5},
  queryDateRow:{flexDirection:"row",alignItems:"center",gap:6,borderTopWidth:1,borderTopColor:"#F0F3F0",marginTop:12,paddingTop:10},
  queryDate:{color:"#8C9991",fontSize:9},
  emptyQueries:{backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,alignItems:"center",padding:25,marginTop:3},
  emptyIcon:{width:54,height:54,borderRadius:18,backgroundColor:C.mint,alignItems:"center",justifyContent:"center"},
  emptyAction:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:C.mint,marginTop:6},
  emptyActionText:{color:C.forest,fontSize:10,fontWeight:"900"}
});
