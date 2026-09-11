import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import DirectionalIonicon from '../../../common/DirectionalIonicon';
import { getImageUrl } from '../../../../utils/imageUtils';
import { useReportPostEventContent } from '../../../../hooks/postEvent';
import { useTranslation } from '../../../../localization';
const Video = ({ uri }) => { const player = useVideoPlayer(uri); return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', height: 360 }} />; };
export default function PostMedia({ post, t, eventId, sessionToken, readOnly, toast }) {
 const [selected, setSelected] = useState(null);
 const { currentLanguage } = useTranslation('postEvent');
 const report = useReportPostEventContent();
 const media = post.media || (post.content?.mediaUrls ? post.content.mediaUrls.map(url => ({ url, type: 'photo' })) : [post]);
 const items = media.filter(item => item.url || item.content?.mediaUrl);
 const active = selected === null ? null : items[selected];
 const label = (en, ar) => currentLanguage === 'ar' ? ar : en;
 const uri = item => getImageUrl(item.url || item.content?.mediaUrl);
 if (!items.length) return null;
 return <>
  <View style={styles.grid}>{items.slice(0,4).map((item,index) => <TouchableOpacity key={item._id || index} accessibilityRole="button" accessibilityLabel={label('Open media','عرض الوسائط')} onPress={() => setSelected(index)} style={[styles.tile,{width:items.length===1?'100%':'49.5%'}]}>
   {item.type==='video' ? <View style={styles.video}><Ionicons name="play-circle" size={54} color="#C28E5C" /></View> : <Image source={{uri:uri(item)}} style={styles.image} resizeMode="cover" />}
   {index===3 && items.length>4 && <View style={styles.overlay}><Text style={styles.more}>+{items.length-4}</Text></View>}
  </TouchableOpacity>)}</View>
  <Modal visible={!!active} onRequestClose={() => setSelected(null)} animationType="fade"><SafeAreaView style={styles.viewer}>
   <View style={styles.toolbar}><Text style={styles.counter}>{selected===null?'':`${selected+1} / ${items.length}`}</Text><TouchableOpacity style={styles.control} accessibilityLabel={t('aria.close',{defaultValue:label('Close','إغلاق')})} onPress={() => setSelected(null)}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity></View>
   <ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center'}} maximumZoomScale={4} minimumZoomScale={1}>{active && (active.type==='video' ? <Video key={uri(active)} uri={uri(active)} /> : <Image source={{uri:uri(active)}} resizeMode="contain" style={{width:'100%',height:460}} />)}</ScrollView>
   <View style={styles.toolbar}>
    <TouchableOpacity style={styles.control} disabled={!selected} onPress={() => setSelected(index => index-1)} accessibilityLabel={label('Previous media','الوسائط السابقة')}><DirectionalIonicon name="chevron-back" size={28} color={!selected?'#555':'#FFF'} /></TouchableOpacity>
    {!readOnly && active?._id && <TouchableOpacity disabled={report.isPending} style={styles.control} accessibilityLabel={t('moderation.report')} onPress={() => report.mutate({eventId,sessionToken,targetType:'post_event_media',targetId:active._id,reason:'other'},{onSuccess:()=>toast?.success(t('moderation.reported')),onError:()=>toast?.error(t('moderation.failed'))})}><Ionicons name="flag-outline" size={22} color="#FFF" /></TouchableOpacity>}
    <TouchableOpacity style={styles.control} disabled={selected===items.length-1} onPress={() => setSelected(index => index+1)} accessibilityLabel={label('Next media','الوسائط التالية')}><DirectionalIonicon name="chevron-forward" size={28} color={selected===items.length-1?'#555':'#FFF'} /></TouchableOpacity>
   </View>
  </SafeAreaView></Modal>
 </>;
}
const styles=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:3},tile:{height:250,backgroundColor:'#F5ECE4'},image:{width:'100%',height:'100%'},video:{flex:1,justifyContent:'center',alignItems:'center'},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'#0008',justifyContent:'center',alignItems:'center'},more:{color:'#FFF',fontSize:32,fontFamily:'Cairo_700Bold'},viewer:{flex:1,backgroundColor:'#111'},toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},control:{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'},counter:{color:'#FFF',fontSize:16}});
