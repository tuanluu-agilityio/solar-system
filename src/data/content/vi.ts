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
};
