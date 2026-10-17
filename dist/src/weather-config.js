export const COURSE_WEATHER=Object.freeze(['normal','night','rainy']);
export function weatherProfile(h,mode='normal') {
  mode=COURSE_WEATHER.includes(mode)?mode:'normal';const golf=h.mode==='golf',c=h.course||{};
  const themedNight=['halloween','space','cyberpunk'].includes(c.eventTheme);
  const daySky={meadow:'#559bd0',garden:'#6dabcf','alpine-pass':'#427fb2',wetland:'#71aac4',lookout:'#6091bc',lake:'#5e94bc'}[h.backdrop] || (h.courseIndex===1?'#4d98c5':'#4a95cb');
  if(mode==='night')return {mode,zenith:'#071226',horizon:'#344666',fog:'#233b52',sun:'#a8c8ff',sunIntensity:.8,skyLight:'#a5bedf',groundLight:'#52677e',hemi:1.05,exposure:.94,near:golf?600:70,far:golf?2300:190};
  if(mode==='rainy')return {mode,zenith:themedNight?'#343448':'#576e83',horizon:themedNight?'#7a8191':'#adbfc3',fog:themedNight?'#626e80':'#9aafb3',sun:'#d1e3e9',sunIntensity:themedNight?.8:1.05,skyLight:'#d0e3e9',groundLight:'#617565',hemi:themedNight?1.25:1.7,exposure:1.02,near:golf?300:55,far:golf?1850:175};
  if(c.eventTheme)return {mode,night:Number(themedNight),zenith:c.zenith||daySky,horizon:c.horizon||c.sky,fog:c.sky,sun:themedNight?'#c7d3ff':'#fff0d7',sunIntensity:themedNight?1.6:2.5,skyLight:themedNight?'#c1c8e0':'#e9f8ff',groundLight:themedNight?'#62637c':'#789262',hemi:themedNight?1.35:1.8,exposure:1.05,near:themedNight?550:800,far:2400};
  return {mode,zenith:daySky,horizon:'#9ac9e9',fog:'#a9cce0',sun:h.atmosphere?.sun||'#fff0d7',sunIntensity:golf?(h.atmosphere?.intensity??2.4):c.theme==='city'?1.4:3,skyLight:'#e9f8ff',groundLight:'#789262',hemi:golf?1.8:2.3,exposure:golf?1.05:1.24,near:golf?720:65,far:golf?2450:155};
}
