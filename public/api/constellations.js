window.GNSS_COLORS=Object.freeze({"G":"#55a8ff","R":"#ff7e7e","E":"#48d6c7","J":"#dc8bff","C":"#ffc45b","S":"#9b9fff"});
window.GNSS_NAMES=Object.freeze({"G":"GPS","R":"GLONASS","E":"Galileo","J":"QZSS","C":"BeiDou","S":"SBAS"});
for(const [s,c] of Object.entries(GNSS_COLORS))document.documentElement.style.setProperty("--"+s,c);