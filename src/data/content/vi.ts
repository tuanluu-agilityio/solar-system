import type { BodyContent, ContentId } from '../types';

// Vietnamese body content, based on NASA Science pages
// (https://science.nasa.gov/solar-system/). Numbers in the info panel's data
// fields come from bodies.ts; the prose here only rounds where it reads better.
export const CONTENT_VI: Record<ContentId, BodyContent> = {
  sun: {
    name: 'Mặt Trời',
    kindLabel: 'Ngôi sao',
    description:
      'Mặt Trời là một quả cầu khí hydro và heli khổng lồ, đã khoảng 4,6 tỉ năm tuổi và được giữ lại với nhau bởi chính lực hấp dẫn của nó. Phản ứng tổng hợp hạt nhân trong lõi biến hydro thành heli, toả ra ánh sáng và nhiệt nuôi sống sự sống trên Trái Đất. Mặt Trời chiếm khoảng 99,8% khối lượng của cả Hệ Mặt Trời.',
    facts: [
      'Khoảng 1,3 triệu Trái Đất có thể lọt vừa bên trong Mặt Trời.',
      'Lõi Mặt Trời nóng khoảng 15 triệu °C, còn bề mặt nhìn thấy "chỉ" khoảng 5.500 °C.',
      'Ánh sáng Mặt Trời mất khoảng 8 phút để tới Trái Đất.',
      'Mặt Trời là một sao lùn vàng khá bình thường, chỉ là một trong hàng tỉ ngôi sao của Dải Ngân Hà.',
    ],
  },
  mercury: {
    name: 'Sao Thủy',
    kindLabel: 'Hành tinh đất đá',
    description:
      'Sao Thủy là hành tinh nhỏ nhất và gần Mặt Trời nhất, chỉ lớn hơn Mặt Trăng một chút. Gần như không có khí quyển giữ nhiệt, bề mặt đầy hố va chạm của nó nóng như thiêu ban ngày và lạnh cóng ban đêm. Đây cũng là hành tinh chạy quanh Mặt Trời nhanh nhất.',
    facts: [
      'Ban ngày nhiệt độ lên tới khoảng 430 °C, ban đêm tụt xuống khoảng −180 °C.',
      'Một năm trên Sao Thủy dài 88 ngày Trái Đất, nhưng từ lúc mặt trời mọc đến lần mọc tiếp theo mất tới 176 ngày Trái Đất.',
      'Có thể có băng nước ẩn trong các hố ở hai cực, nơi ánh nắng không bao giờ chiếu tới.',
      'Khi lòng hành tinh nguội đi, Sao Thủy co lại, làm vỏ nhăn thành những vách đá cao tới hơn 1,5 km.',
    ],
  },
  venus: {
    name: 'Sao Kim',
    kindLabel: 'Hành tinh đất đá',
    description:
      'Sao Kim có kích thước gần bằng Trái Đất nhưng lại là một thế giới hoàn toàn khác. Bầu khí quyển dày đặc khí CO₂ cùng những đám mây axit sunfuric giữ nhiệt, gây hiệu ứng nhà kính mất kiểm soát. Vì vậy đây là hành tinh nóng nhất Hệ Mặt Trời, dù Sao Thủy ở gần Mặt Trời hơn.',
    facts: [
      'Bề mặt nóng khoảng 465 °C, đủ để làm chảy chì.',
      'Sao Kim tự quay ngược chiều so với hầu hết các hành tinh, nên ở đó Mặt Trời mọc ở phía tây.',
      'Một ngày trên Sao Kim (243 ngày Trái Đất) dài hơn cả một năm của nó (225 ngày Trái Đất).',
      'Áp suất không khí ở bề mặt gấp khoảng 90 lần áp suất mực nước biển trên Trái Đất.',
    ],
  },
  earth: {
    name: 'Trái Đất',
    kindLabel: 'Hành tinh đất đá',
    description:
      'Trái Đất là ngôi nhà của chúng ta và là nơi duy nhất từng biết có sự sống. Đây là thế giới duy nhất được biết có nước lỏng trên bề mặt, phủ khoảng 70% hành tinh. Bầu khí quyển giàu nitơ và oxy cùng từ trường bao quanh che chắn cho chúng ta khỏi bức xạ có hại từ vũ trụ.',
    facts: [
      'Trái Đất là hành tinh đất đá lớn nhất và là hành tinh có mật độ cao nhất Hệ Mặt Trời.',
      'Trục quay nghiêng khoảng 23,4°, chính điều này tạo ra các mùa trong năm.',
      'Trái Đất là hành tinh duy nhất không mang tên một vị thần Hy Lạp hay La Mã.',
      'Tốc độ tự quay của Trái Đất đang chậm dần, khiến mỗi ngày dài thêm một phần rất nhỏ của giây sau mỗi thế kỷ.',
    ],
  },
  moon: {
    name: 'Mặt Trăng',
    kindLabel: 'Vệ tinh tự nhiên',
    description:
      'Mặt Trăng là vệ tinh tự nhiên duy nhất của Trái Đất và là vật sáng nhất trên bầu trời đêm. Nhiều khả năng nó hình thành từ mảnh vỡ bắn ra khi một thiên thể cỡ Sao Hỏa đâm vào Trái Đất thuở sơ khai. Lực hấp dẫn của Mặt Trăng tạo ra thủy triều và giúp trục Trái Đất ổn định, nhờ đó khí hậu ít biến động hơn.',
    facts: [
      'Mặt Trăng luôn quay một mặt về phía Trái Đất vì nó tự quay đúng một vòng trong mỗi vòng quỹ đạo.',
      'Mười hai phi hành gia đã đặt chân lên Mặt Trăng trong các chuyến Apollo của NASA từ năm 1969 đến 1972.',
      'Mặt Trăng đang xa dần Trái Đất, khoảng 3,8 cm mỗi năm.',
      'Vì gần như không có khí quyển, dấu chân trên Mặt Trăng có thể tồn tại hàng triệu năm.',
    ],
  },
  mars: {
    name: 'Sao Hỏa',
    kindLabel: 'Hành tinh đất đá',
    description:
      'Sao Hỏa là một hoang mạc lạnh và đầy bụi, có màu đỏ do khoáng chất sắt bị gỉ trong đất. Những lòng sông và đáy hồ khô cạn cho thấy nước lỏng từng chảy trên bề mặt hành tinh này. Ngày nay đây là hành tinh được khám phá nhiều nhất sau Trái Đất, với các xe tự hành và tàu quỹ đạo đang tìm dấu vết sự sống thời xa xưa.',
    facts: [
      'Núi Olympus Mons trên Sao Hỏa là ngọn núi lửa lớn nhất Hệ Mặt Trời, cao gần gấp ba đỉnh Everest.',
      'Một ngày trên Sao Hỏa dài hơn 24,6 giờ một chút, rất gần với một ngày Trái Đất.',
      'Sao Hỏa có hai mặt trăng nhỏ, hình dạng sần sùi: Phobos và Deimos.',
      'Bão bụi trên Sao Hỏa có thể lớn tới mức bao phủ cả hành tinh.',
    ],
  },
  'asteroid-belt': {
    name: 'Vành đai tiểu hành tinh',
    kindLabel: 'Vùng trong Hệ Mặt Trời',
    description:
      'Vành đai tiểu hành tinh chính là một vùng rộng hình vành khuyên nằm giữa Sao Hỏa và Sao Mộc, cách Mặt Trời khoảng 2,2 đến 3,2 đơn vị thiên văn (AU). Nơi đây có hàng triệu khối đá còn sót lại từ thời các hành tinh hình thành. Lực hấp dẫn mạnh của Sao Mộc đã ngăn chúng kết lại thành một hành tinh.',
    facts: [
      'Gộp tất cả tiểu hành tinh trong vành đai lại, tổng khối lượng vẫn nhỏ hơn Mặt Trăng.',
      'Ceres, thiên thể lớn nhất vành đai, là một hành tinh lùn và chiếm khoảng một phần tư tổng khối lượng vành đai.',
      'Các nhà khoa học ước tính có từ 1,1 đến 1,9 triệu tiểu hành tinh lớn hơn 1 km.',
      'Vành đai phần lớn là khoảng trống, các tàu vũ trụ đã bay xuyên qua mà không va phải gì.',
    ],
  },
  jupiter: {
    name: 'Sao Mộc',
    kindLabel: 'Hành tinh khí khổng lồ',
    description:
      'Sao Mộc là hành tinh lớn nhất, nặng hơn gấp đôi tất cả các hành tinh còn lại cộng lại. Nó là một quả cầu khổng lồ chủ yếu gồm hydro và heli, khoác những dải mây xoáy cuộn. Trong đại gia đình vệ tinh của nó có Ganymede, mặt trăng lớn nhất Hệ Mặt Trời.',
    facts: [
      'Khoảng 1.000 Trái Đất có thể lọt vừa bên trong Sao Mộc.',
      'Vết Đỏ Lớn là một cơn bão rộng hơn cả Trái Đất, đã hoành hành hơn 300 năm.',
      'Sao Mộc có ngày ngắn nhất trong các hành tinh, chỉ khoảng 10 giờ.',
      'Mặt trăng Europa của nó nhiều khả năng có một đại dương mênh mông dưới lớp vỏ băng.',
      'Sao Mộc có vành đai mờ bằng bụi tối, được Voyager 1 phát hiện năm 1979.',
    ],
  },
  saturn: {
    name: 'Sao Thổ',
    kindLabel: 'Hành tinh khí khổng lồ',
    description:
      'Sao Thổ nổi tiếng với hệ vành đai rực rỡ, gồm hàng tỉ mảnh băng và đá. Giống Sao Mộc, nó là một hành tinh khổng lồ chủ yếu gồm hydro và heli. Tàu Cassini của NASA đã nghiên cứu cận cảnh Sao Thổ và các mặt trăng của nó suốt 13 năm.',
    facts: [
      'Các vành đai chính trải rộng hàng trăm nghìn kilômét nhưng thường chỉ dày khoảng 10 m.',
      'Sao Thổ là hành tinh duy nhất có mật độ nhỏ hơn nước.',
      'Mặt trăng lớn nhất của nó, Titan, có hồ và biển chứa metan lỏng.',
      'Những tia nước phun vọt vào không gian từ mặt trăng Enceladus.',
      'Một dòng khí lưu hình lục giác cuộn xoáy quanh cực bắc Sao Thổ.',
    ],
  },
  uranus: {
    name: 'Sao Thiên Vương',
    kindLabel: 'Hành tinh băng khổng lồ',
    description:
      'Sao Thiên Vương là một hành tinh băng khổng lồ quay nằm nghiêng, trục lệch khoảng 98° so với quỹ đạo. Khí metan trong khí quyển hấp thụ ánh sáng đỏ nên hành tinh có màu xanh lam nhạt. Đây là hành tinh đầu tiên được phát hiện bằng kính thiên văn, do William Herschel tìm ra năm 1781.',
    facts: [
      'Vì trục nghiêng, mỗi cực được chiếu sáng liên tục khoảng 21 năm rồi chìm trong bóng tối 21 năm.',
      'Sao Thiên Vương tự quay ngược chiều so với hầu hết các hành tinh.',
      'Các mặt trăng của nó mang tên nhân vật trong tác phẩm của Shakespeare và Alexander Pope.',
      'Đỉnh mây có thể lạnh tới khoảng −224 °C, bầu khí quyển hành tinh lạnh nhất từng đo được trong Hệ Mặt Trời.',
      'Mới chỉ có một tàu vũ trụ ghé thăm Sao Thiên Vương: Voyager 2, năm 1986.',
    ],
  },
  neptune: {
    name: 'Sao Hải Vương',
    kindLabel: 'Hành tinh băng khổng lồ',
    description:
      'Sao Hải Vương là hành tinh xa nhất, một thế giới tối và lạnh bị quần thảo bởi những cơn gió siêu thanh. Đây là hành tinh đầu tiên được tìm ra nhờ toán học: các nhà thiên văn tính ra vị trí của nó từ cách nó kéo lệch quỹ đạo Sao Thiên Vương. Johann Galle đã nhìn thấy nó năm 1846 ngay trong đêm tìm kiếm đầu tiên.',
    facts: [
      'Gió trên Sao Hải Vương đạt hơn 2.000 km/h, nhanh nhất Hệ Mặt Trời.',
      'Một vòng quanh Mặt Trời mất khoảng 165 năm Trái Đất.',
      'Mặt trăng lớn nhất, Triton, quay ngược chiều và có thể là một thiên thể từ Vành đai Kuiper bị bắt giữ.',
      'Voyager 2 bay ngang qua năm 1989 và chụp được Vết Tối Lớn, một cơn bão đủ lớn để nuốt trọn Trái Đất.',
    ],
  },
  pluto: {
    name: 'Sao Diêm Vương',
    kindLabel: 'Hành tinh lùn',
    description:
      'Sao Diêm Vương được phát hiện năm 1930 và được coi là hành tinh thứ chín suốt 76 năm. Năm 2006, Hiệp hội Thiên văn Quốc tế (IAU) xếp lại nó thành hành tinh lùn, vì nó chưa dọn sạch các thiên thể khác trên quỹ đạo của mình trong Vành đai Kuiper đông đúc. Năm 2015, tàu New Horizons của NASA bay ngang qua và hé lộ những dãy núi băng cùng một sông băng khổng lồ hình trái tim.',
    facts: [
      'Theo định nghĩa của IAU, hành tinh phải quay quanh Mặt Trời, gần tròn và dọn sạch vùng quỹ đạo; Sao Diêm Vương không đạt điều kiện cuối.',
      'Sao Diêm Vương chỉ rộng khoảng hai phần ba Mặt Trăng của Trái Đất.',
      'Mặt trăng lớn nhất của nó, Charon, to bằng khoảng một nửa Sao Diêm Vương, và cả hai luôn quay cùng một mặt về phía nhau.',
      'Sao Diêm Vương có năm mặt trăng đã biết: Charon, Nix, Hydra, Kerberos và Styx.',
      'Một vòng quanh Mặt Trời mất khoảng 248 năm Trái Đất.',
    ],
  },
  phobos: {
    name: 'Phobos',
    kindLabel: 'Vệ tinh của Sao Hỏa',
    description:
      'Phobos là vệ tinh lớn hơn và ở gần hơn trong hai vệ tinh nhỏ của Sao Hỏa, một khối đá sẫm màu, xù xì, kích thước khoảng 27 × 22 × 18 km. Nó quay quanh Sao Hỏa ba vòng mỗi ngày, chỉ cách bề mặt khoảng 6.000 km. Bề mặt Phobos phủ bụi mịn và chi chít vết va chạm của hàng nghìn thiên thạch.',
    facts: [
      'Hố va chạm lớn nhất của nó, Stickney, rộng khoảng 9 km.',
      'Phobos đang tiến dần về phía Sao Hỏa khoảng 1,8 m mỗi trăm năm; khoảng 50 triệu năm nữa nó sẽ đâm vào Sao Hỏa hoặc vỡ ra thành một vành đai.',
      'Asaph Hall phát hiện Phobos vào ngày 17 tháng 8 năm 1877.',
      'Nơi có nắng chiếu đạt khoảng −4 °C, còn nơi khuất bóng xuống tới khoảng −112 °C.',
    ],
  },
  deimos: {
    name: 'Deimos',
    kindLabel: 'Vệ tinh của Sao Hỏa',
    description:
      'Deimos là vệ tinh nhỏ hơn và ở xa hơn của Sao Hỏa, một khối có hình dạng bất thường kích thước khoảng 15 × 12 × 11 km. Bề mặt sẫm màu của nó làm từ vật chất giàu carbon, giống các tiểu hành tinh ở rìa ngoài vành đai tiểu hành tinh. Một lớp bụi có thể dày tới 100 m lấp bớt các hố va chạm, nên Deimos trông nhẵn hơn Phobos.',
    facts: [
      'Deimos quay quanh Sao Hỏa khoảng 30 giờ một vòng.',
      'Tên của nó nghĩa là “nỗi khiếp sợ”; trong thần thoại Hy Lạp, Deimos là anh em của Phobos.',
      'Asaph Hall phát hiện Deimos vào ngày 11 tháng 8 năm 1877, sáu ngày trước Phobos.',
      'Phần lớn hố va chạm trên Deimos có đường kính dưới 2,5 km.',
    ],
  },
  io: {
    name: 'Io',
    kindLabel: 'Vệ tinh của Sao Mộc',
    description:
      'Io là thế giới có núi lửa hoạt động mạnh nhất Hệ Mặt Trời, với hàng trăm núi lửa, có nơi phun dung nham cao hàng chục kilômét. Io bị giằng co giữa lực hấp dẫn khổng lồ của Sao Mộc và những lực kéo nhỏ hơn nhưng đều đặn của Europa và Ganymede. Lưu huỳnh ở nhiều dạng khác nhau tô bề mặt Io thành các màu vàng, cam, đỏ và trắng.',
    facts: [
      'Galileo Galilei phát hiện Io vào ngày 8 tháng 1 năm 1610.',
      'Lực hút của Sao Mộc làm bề mặt rắn của Io nhô lên, hạ xuống tới 100 m.',
      'Cứ mỗi vòng Ganymede quay quanh Sao Mộc, Europa quay hai vòng và Io quay bốn vòng.',
      'Mỗi giây, Sao Mộc tước đi khoảng 1 tấn vật chất của Io.',
    ],
  },
  europa: {
    name: 'Europa',
    kindLabel: 'Vệ tinh của Sao Mộc',
    description:
      'Europa là một vệ tinh băng có kích thước bằng khoảng 90% Mặt Trăng, bề mặt sáng của nó chằng chịt những vết nứt dài màu nâu đỏ. Bên dưới lớp vỏ băng dày khoảng 15 đến 25 km là một đại dương sâu 60 đến 150 km, có thể chứa lượng nước gấp đôi tất cả các đại dương trên Trái Đất. Vì thế Europa là một trong những nơi hứa hẹn nhất để tìm kiếm sự sống ngoài Trái Đất.',
    facts: [
      'Europa có rất ít hố va chạm nên bề mặt của nó có thể chỉ mới 40 đến 90 triệu năm tuổi.',
      'Bề mặt băng của Europa phản xạ ánh sáng Mặt Trời nhiều gấp khoảng 5,5 lần Mặt Trăng.',
      'Ánh sáng Mặt Trời mất khoảng 45 phút để tới Europa.',
      'Người ta đã thấy những cột nước có thể đang phun cao khoảng 160 km trên bề mặt.',
    ],
  },
  ganymede: {
    name: 'Ganymede',
    kindLabel: 'Vệ tinh của Sao Mộc',
    description:
      'Ganymede là vệ tinh lớn nhất Hệ Mặt Trời, lớn hơn cả hành tinh Sao Thủy và hành tinh lùn Sao Diêm Vương. Bề mặt của nó xen kẽ những vùng tối cổ xưa đầy hố va chạm với những vùng sáng hơn bị cắt ngang bởi các dải gờ và rãnh. Bên dưới lớp vỏ chủ yếu là băng dày khoảng 150 km là một đại dương nước mặn, được cho là chứa nhiều nước hơn toàn bộ nước trên bề mặt Trái Đất.',
    facts: [
      'Đây là vệ tinh duy nhất được biết có từ trường riêng, do tàu Galileo của NASA phát hiện năm 1996.',
      'Từ trường của Ganymede tạo ra cực quang quanh cực bắc và cực nam của nó.',
      'Ganymede quay hết một vòng quanh Sao Mộc trong khoảng 7 ngày.',
      'Kính viễn vọng Hubble đã tìm thấy bằng chứng về một lớp khí quyển oxy mỏng.',
    ],
  },
  callisto: {
    name: 'Callisto',
    kindLabel: 'Vệ tinh của Sao Mộc',
    description:
      'Callisto có bề mặt cổ xưa nhất và nhiều hố va chạm nhất Hệ Mặt Trời, khoảng 4 tỷ năm tuổi. Không có núi lửa hay mảng kiến tạo nào xóa đi dấu vết, nên các hố va chạm cứ thế chồng chất qua thời gian. Những đốm trắng sáng, được cho là đỉnh các hố phủ băng nước, rải rác trên nền bề mặt tối màu.',
    facts: [
      'Galileo Galilei phát hiện Callisto năm 1610, cùng với Io, Europa và Ganymede.',
      'Có thể có một đại dương nước mặn nằm sâu khoảng 250 km dưới bề mặt.',
      'Callisto ở xa Sao Mộc gấp khoảng 4,5 lần so với Io.',
      'Nó có một lớp khí quyển carbon dioxide cực kỳ mỏng.',
    ],
  },
  enceladus: {
    name: 'Enceladus',
    kindLabel: 'Vệ tinh của Sao Thổ',
    description:
      'Enceladus là một vệ tinh băng nhỏ, đường kính chỉ khoảng 500 km, nhưng có bề mặt trắng và phản xạ ánh sáng mạnh nhất Hệ Mặt Trời. Những tia hơi nước và hạt băng phun ra từ các khe nứt ấm gần cực nam, được gọi vui là “vằn hổ”. Một đại dương ẩn bên dưới lớp băng nuôi các tia phun ấy.',
    facts: [
      'Vì phản xạ quá nhiều ánh sáng Mặt Trời, bề mặt của nó lạnh khoảng −201 °C.',
      'Bụi băng phun ra trải dọc quỹ đạo của nó và tạo thành vành E của Sao Thổ.',
      'Các tia phun rời bề mặt với tốc độ khoảng 400 m mỗi giây.',
      'William Herschel phát hiện Enceladus vào ngày 28 tháng 8 năm 1789.',
    ],
  },
  titan: {
    name: 'Titan',
    kindLabel: 'Vệ tinh của Sao Thổ',
    description:
      'Titan là vệ tinh lớn nhất của Sao Thổ và là vệ tinh duy nhất có khí quyển dày, một lớp sương mù màu cam giàu nitơ che khuất bề mặt. Bên dưới, mưa methane và ethane đổ đầy các hồ và biển, khiến Titan là thế giới duy nhất ngoài Trái Đất được biết có chất lỏng trên bề mặt. Một đại dương nước có thể nằm sâu 55 đến 80 km dưới lớp vỏ băng.',
    facts: [
      'Titan rộng hơn Mặt Trăng gần 50%; chỉ Ganymede là lớn hơn nó.',
      'Áp suất khí quyển trên bề mặt Titan cao hơn Trái Đất khoảng 60%.',
      'Christiaan Huygens phát hiện Titan vào ngày 25 tháng 3 năm 1655.',
      'Năm 2005, tàu đổ bộ Huygens hạ cánh xuống Titan, lần hạ cánh đầu tiên ở vùng ngoài Hệ Mặt Trời.',
    ],
  },
};
