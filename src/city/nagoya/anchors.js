// 87 anchors (spec 02 §4). Coordinates from docs/data/nagoya-anchors.json
// (ekidata via piuccio/open-data-jp-railway-stations, 2018); names are the
// post 2023-01-04 names with the old one in formerName. dia is the
// platform-wall diagram, hand-drawn to spec 02 §11: 東山線 along y=0 in even
// steps, 名城線 a rectangle (west x=0, north y=-4, east x=9, south y=7),
// 名港線 down x=-2, 鶴舞線 down x=-1.5 then east to 赤池, 桜通線 along y=-1
// and down x=4.5 to 徳重. x runs east, y runs south. The ORDER is the save format: a
// save stores anchor indices, so once shipped this array only grows at the
// end. `opened` is the earliest opening date among the station's codes
// (history doc §7), display only.
export const ANCHORS = [
  { id: 'nagoya', name: '名古屋', geo: [35.171252, 136.883925], dia: [-3, 0], codes: ['H08', 'S02'], opened: '1957-11-15', hub: true }, // 0 start
  { id: 'fushimi', name: '伏見', geo: [35.169273, 136.897427], dia: [-1.5, 0], codes: ['H09', 'T07'], opened: '1957-11-15' }, // 1 start
  { id: 'sakae', name: '栄', geo: [35.169990, 136.908031], dia: [0, 0], codes: ['H10', 'M05'], opened: '1957-11-15' }, // 2 start
  { id: 'shinsakaemachi', name: '新栄町', geo: [35.170729, 136.920377], dia: [1.5, 0], codes: ['H11'], opened: '1960-06-15' }, // 3 h-east-1
  { id: 'chikusa', name: '千種', geo: [35.170625, 136.930402], dia: [3, 0], codes: ['H12'], opened: '1960-06-15' }, // 4 h-east-1
  { id: 'imaike', name: '今池', geo: [35.169919, 136.937331], dia: [4.5, 0], codes: ['H13', 'S08'], opened: '1960-06-15' }, // 5 h-east-1
  { id: 'ikeshita', name: '池下', geo: [35.167675, 136.946486], dia: [6, 0], codes: ['H14'], opened: '1960-06-15' }, // 6 h-east-1
  { id: 'kakuozan', name: '覚王山', geo: [35.166565, 136.953708], dia: [7.5, 0], codes: ['H15'], opened: '1963-04-01' }, // 7 h-east-1
  { id: 'motoyama', name: '本山', geo: [35.163923, 136.963441], dia: [9, 0], codes: ['H16', 'M17'], opened: '1963-04-01' }, // 8 h-east-1
  { id: 'higashiyama-koen', name: '東山公園', geo: [35.160454, 136.972873], dia: [10.5, 0], codes: ['H17'], opened: '1963-04-01' }, // 9 h-east-1
  { id: 'hoshigaoka', name: '星ヶ丘', geo: [35.162399, 136.985095], dia: [12, 0], codes: ['H18'], opened: '1967-03-30' }, // 10 h-east-2
  { id: 'issha', name: '一社', geo: [35.168231, 136.995927], dia: [13.5, -0.5], codes: ['H19'], opened: '1969-04-01' }, // 11 h-east-2
  { id: 'kamiyashiro', name: '上社', geo: [35.173656, 137.007081], dia: [14.5, -1], codes: ['H20'], opened: '1970-12-10' }, // 12 h-east-2
  { id: 'hongo', name: '本郷', geo: [35.175453, 137.013425], dia: [15.5, -1.5], codes: ['H21'], opened: '1969-04-01' }, // 13 h-east-2
  { id: 'fujigaoka', name: '藤が丘', geo: [35.182415, 137.021361], dia: [16.5, -2], codes: ['H22'], opened: '1969-04-01' }, // 14 h-east-2
  { id: 'kamejima', name: '亀島', geo: [35.177526, 136.876756], dia: [-4, -1], codes: ['H07'], opened: '1969-04-01' }, // 15 h-west-1
  { id: 'honjin', name: '本陣', geo: [35.177135, 136.866782], dia: [-5.5, -1], codes: ['H06'], opened: '1969-04-01' }, // 16 h-west-1
  { id: 'nakamura-nisseki', name: '中村日赤', geo: [35.172385, 136.861733], dia: [-6.5, 0], codes: ['H05'], opened: '1969-04-01' }, // 17 h-west-1
  { id: 'nakamura-koen', name: '中村公園', geo: [35.167830, 136.855056], dia: [-7, 1], codes: ['H04'], opened: '1969-04-01' }, // 18 h-west-1
  { id: 'hisaya-odori', name: '久屋大通', geo: [35.173784, 136.908156], dia: [0, -1], codes: ['M06', 'S05'], opened: '1989-09-10' }, // 19 m-north
  { id: 'nagoyajo', name: '名古屋城', geo: [35.181560, 136.905379], dia: [0, -2], codes: ['M07'], opened: '1965-10-15', formerName: '市役所' }, // 20 m-north
  { id: 'meijo-koen', name: '名城公園', geo: [35.190528, 136.904748], dia: [0, -3], codes: ['M08'], opened: '1971-12-20' }, // 21 m-north
  { id: 'kurokawa', name: '黒川', geo: [35.197183, 136.910178], dia: [0, -4], codes: ['M09'], opened: '1971-12-20' }, // 22 m-north
  { id: 'shiga-hondori', name: '志賀本通', geo: [35.196281, 136.921210], dia: [1.5, -4], codes: ['M10'], opened: '1971-12-20' }, // 23 m-north
  { id: 'heian-dori', name: '平安通', geo: [35.195934, 136.929784], dia: [3, -4], codes: ['M11', 'K02'], opened: '1971-12-20' }, // 24 m-north
  { id: 'ozone', name: '大曽根', geo: [35.192385, 136.937204], dia: [4.5, -4], codes: ['M12'], opened: '1971-12-20' }, // 25 m-north
  { id: 'yabacho', name: '矢場町', geo: [35.163785, 136.908990], dia: [0, 1], codes: ['M04'], opened: '1967-03-30' }, // 26 m-south-1
  { id: 'kamimaezu', name: '上前津', geo: [35.157477, 136.906815], dia: [0, 2], codes: ['M03', 'T09'], opened: '1967-03-30' }, // 27 m-south-1
  { id: 'higashi-betsuin', name: '東別院', geo: [35.150453, 136.904824], dia: [0, 3], codes: ['M02'], opened: '1967-03-30' }, // 28 m-south-1
  { id: 'kanayama', name: '金山', geo: [35.143520, 136.901611], dia: [0, 4], codes: ['M01', 'E01'], opened: '1967-03-30' }, // 29 m-south-1
  { id: 'hibino', name: '日比野', geo: [35.132711, 136.893125], dia: [-1, 5], codes: ['E02'], opened: '1971-03-29' }, // 30 e-port
  { id: 'rokubancho', name: '六番町', geo: [35.124623, 136.888715], dia: [-2, 6], codes: ['E03'], opened: '1971-03-29' }, // 31 e-port
  { id: 'tokai-dori', name: '東海通', geo: [35.113388, 136.887336], dia: [-2, 7], codes: ['E04'], opened: '1971-03-29' }, // 32 e-port
  { id: 'minato-kuyakusho', name: '港区役所', geo: [35.105736, 136.884550], dia: [-2, 8], codes: ['E05'], opened: '1971-03-29' }, // 33 e-port
  { id: 'tsukijiguchi', name: '築地口', geo: [35.099348, 136.883162], dia: [-2, 9], codes: ['E06'], opened: '1971-03-29' }, // 34 e-port
  { id: 'nagoyako', name: '名古屋港', geo: [35.093480, 136.881971], dia: [-2, 10], codes: ['E07'], opened: '1971-03-29' }, // 35 e-port
  { id: 'nishi-takakura', name: '西高蔵', geo: [35.134622, 136.901769], dia: [0, 5], codes: ['M28'], opened: '1974-03-30' }, // 36 m-south-2
  { id: 'atsuta-jingu-nishi', name: '熱田神宮西', geo: [35.127956, 136.906769], dia: [0, 6], codes: ['M27'], opened: '1974-03-30', formerName: '神宮西' }, // 37 m-south-2
  { id: 'atsuta-jingu-temmacho', name: '熱田神宮伝馬町', geo: [35.120735, 136.910380], dia: [1.5, 7], codes: ['M26'], opened: '1974-03-30', formerName: '伝馬町' }, // 38 m-south-2
  { id: 'horita', name: '堀田', geo: [35.116644, 136.921685], dia: [3, 7], codes: ['M25'], opened: '1974-03-30' }, // 39 m-south-2
  { id: 'myoon-dori', name: '妙音通', geo: [35.117125, 136.929545], dia: [4.5, 7], codes: ['M24'], opened: '1974-03-30' }, // 40 m-south-2
  { id: 'aratamabashi', name: '新瑞橋', geo: [35.117734, 136.936603], dia: [6, 7], codes: ['M23', 'S14'], opened: '1974-03-30' }, // 41 m-south-2
  { id: 'iwatsuka', name: '岩塚', geo: [35.158459, 136.854406], dia: [-7, 2.5], codes: ['H03'], opened: '1982-09-21' }, // 42 h-west-2
  { id: 'hatta', name: '八田', geo: [35.148986, 136.853278], dia: [-7, 4], codes: ['H02'], opened: '1982-09-21' }, // 43 h-west-2
  { id: 'takabata', name: '高畑', geo: [35.139161, 136.853466], dia: [-7, 5.5], codes: ['H01'], opened: '1982-09-21' }, // 44 h-west-2
  { id: 'osu-kannon', name: '大須観音', geo: [35.160729, 136.898158], dia: [-1.5, 1.5], codes: ['T08'], opened: '1977-03-18' }, // 45 t-south
  { id: 'tsurumai', name: '鶴舞', geo: [35.155960, 136.916749], dia: [1.5, 2.5], codes: ['T10'], opened: '1977-03-18' }, // 46 t-south
  { id: 'arahata', name: '荒畑', geo: [35.149654, 136.925930], dia: [3, 3], codes: ['T11'], opened: '1977-03-18' }, // 47 t-south
  { id: 'gokiso', name: '御器所', geo: [35.149585, 136.934146], dia: [4.5, 3], codes: ['T12', 'S10'], opened: '1977-03-18' }, // 48 t-south
  { id: 'kawana', name: '川名', geo: [35.148703, 136.948717], dia: [6, 3.5], codes: ['T13'], opened: '1977-03-18' }, // 49 t-south
  { id: 'irinaka', name: 'いりなか', geo: [35.143234, 136.955375], dia: [7.5, 4], codes: ['T14'], opened: '1977-03-18' }, // 50 t-south
  { id: 'yagoto', name: '八事', geo: [35.136946, 136.964036], dia: [9, 4.5], codes: ['M20', 'T15'], opened: '1977-03-18' }, // 51 t-south
  { id: 'shiogamaguchi', name: '塩釜口', geo: [35.132433, 136.977529], dia: [10.5, 4.5], codes: ['T16'], opened: '1978-10-01' }, // 52 t-south
  { id: 'ueda', name: '植田', geo: [35.128649, 136.987882], dia: [12, 4.5], codes: ['T17'], opened: '1978-10-01' }, // 53 t-south
  { id: 'hara', name: '原', geo: [35.126118, 136.996714], dia: [13.5, 4.5], codes: ['T18'], opened: '1978-10-01' }, // 54 t-south
  { id: 'hirabari', name: '平針', geo: [35.122766, 137.006904], dia: [15, 4.5], codes: ['T19'], opened: '1978-10-01' }, // 55 t-south
  { id: 'akaike', name: '赤池', geo: [35.121097, 137.017978], dia: [16.5, 4.5], codes: ['T20'], opened: '1978-10-01' }, // 56 t-south
  { id: 'marunouchi', name: '丸の内', geo: [35.173098, 136.898113], dia: [-1.5, -1], codes: ['T06', 'S04'], opened: '1981-11-27' }, // 57 t-north
  { id: 'sengencho', name: '浅間町', geo: [35.183840, 136.890335], dia: [-1.5, -2.5], codes: ['T05'], opened: '1981-11-27' }, // 58 t-north
  { id: 'joshin', name: '浄心', geo: [35.192205, 136.890819], dia: [-1.5, -4], codes: ['T04'], opened: '1981-11-27' }, // 59 t-north
  { id: 'shonai-dori', name: '庄内通', geo: [35.204476, 136.891044], dia: [-1.5, -5.5], codes: ['T03'], opened: '1984-09-06' }, // 60 t-north
  { id: 'shonai-ryokuchi-koen', name: '庄内緑地公園', geo: [35.215186, 136.886963], dia: [-2, -7], codes: ['T02'], opened: '1984-09-06' }, // 61 t-north
  { id: 'kami-otai', name: '上小田井', geo: [35.223482, 136.876941], dia: [-3, -8], codes: ['T01'], opened: '1993-08-12' }, // 62 t-north
  { id: 'kokusai-center', name: '国際センター', geo: [35.172128, 136.889375], dia: [-2.5, -1], codes: ['S03'], opened: '1989-09-10' }, // 63 s-east
  { id: 'takaoka', name: '高岳', geo: [35.174062, 136.915656], dia: [1.5, -1], codes: ['S06'], opened: '1989-09-10' }, // 64 s-east
  { id: 'kurumamichi', name: '車道', geo: [35.173507, 136.929543], dia: [3, -1], codes: ['S07'], opened: '1989-09-10' }, // 65 s-east
  { id: 'fukiage', name: '吹上', geo: [35.158787, 136.935376], dia: [4.5, 1.5], codes: ['S09'], opened: '1994-03-30' }, // 66 s-east
  { id: 'sakurayama', name: '桜山', geo: [35.139695, 136.933316], dia: [4.5, 4], codes: ['S11'], opened: '1994-03-30' }, // 67 s-east
  { id: 'mizuho-kuyakusho', name: '瑞穂区役所', geo: [35.131793, 136.934430], dia: [4.5, 5], codes: ['S12'], opened: '1994-03-30' }, // 68 s-east
  { id: 'mizuho-undojo-nishi', name: '瑞穂運動場西', geo: [35.124949, 136.935477], dia: [5, 6], codes: ['S13'], opened: '1994-03-30' }, // 69 s-east
  { id: 'sakurahommachi', name: '桜本町', geo: [35.109001, 136.936761], dia: [6, 8], codes: ['S15'], opened: '1994-03-30' }, // 70 s-east
  { id: 'tsurusato', name: '鶴里', geo: [35.105738, 136.943433], dia: [6, 9], codes: ['S16'], opened: '1994-03-30' }, // 71 s-east
  { id: 'nonami', name: '野並', geo: [35.102358, 136.955490], dia: [7, 10], codes: ['S17'], opened: '1994-03-30' }, // 72 s-east
  { id: 'taiko-dori', name: '太閤通', geo: [35.167611, 136.873126], dia: [-4.5, 1], codes: ['S01'], opened: '1989-09-10', formerName: '中村区役所' }, // 73 s-west
  { id: 'nagoya-dome-mae-yada', name: 'ナゴヤドーム前矢田', geo: [35.190691, 136.945255], dia: [6, -4], codes: ['M13'], opened: '2000-01-19' }, // 74 m-loop
  { id: 'sunadabashi', name: '砂田橋', geo: [35.188861, 136.953999], dia: [7.5, -4], codes: ['M14'], opened: '2000-01-19' }, // 75 m-loop
  { id: 'chayagasaka', name: '茶屋ヶ坂', geo: [35.184612, 136.962254], dia: [9, -3], codes: ['M15'], opened: '2003-12-13' }, // 76 m-loop
  { id: 'jiyugaoka', name: '自由ヶ丘', geo: [35.174961, 136.966762], dia: [9, -1.5], codes: ['M16'], opened: '2003-12-13' }, // 77 m-loop
  { id: 'nagoya-daigaku', name: '名古屋大学', geo: [35.154261, 136.966580], dia: [9, 1.5], codes: ['M18'], opened: '2003-12-13' }, // 78 m-loop
  { id: 'yagoto-nisseki', name: '八事日赤', geo: [35.144556, 136.965008], dia: [9, 3], codes: ['M19'], opened: '2004-10-06' }, // 79 m-loop
  { id: 'sogo-rehabili-center', name: '総合リハビリセンター', geo: [35.130536, 136.954523], dia: [9, 6], codes: ['M21'], opened: '2004-10-06' }, // 80 m-loop
  { id: 'mizuho-undojo-higashi', name: '瑞穂運動場東', geo: [35.123167, 136.948685], dia: [7.5, 7], codes: ['M22'], opened: '2004-10-06' }, // 81 m-loop
  { id: 'kamiiida', name: '上飯田', geo: [35.203845, 136.929642], dia: [3, -5.5], codes: ['K01'], opened: '2003-03-27' }, // 82 k-line
  { id: 'narukokita', name: '鳴子北', geo: [35.102684, 136.966209], dia: [8, 10.5], codes: ['S18'], opened: '2011-03-27' }, // 83 s-south
  { id: 'aioiyama', name: '相生山', geo: [35.102545, 136.976208], dia: [9, 11], codes: ['S19'], opened: '2011-03-27' }, // 84 s-south
  { id: 'kamisawa', name: '神沢', geo: [35.098518, 136.989540], dia: [10, 11.5], codes: ['S20'], opened: '2011-03-27' }, // 85 s-south
  { id: 'tokushige', name: '徳重', geo: [35.094491, 136.998150], dia: [11, 12], codes: ['S21'], opened: '2011-03-27' }, // 86 s-south
];
