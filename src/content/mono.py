# -*- coding: utf-8 -*-
"""Monoloq movzulari - aktiv danisiq mesqi ucun.
Her movzuda: baslıq(AZ), izah(AZ), koməkci qəliblər(EN ~ AZ)
"""

MONO = [
{"t":"Bu gün nə edirsən","lv":"A1","d":"İndi nə etdiyini və bu gün nə edəcəyini danış. Present Continuous və 'going to' işlət.","p":[
 "Right now I am ... ~ İndi ... edirəm",
 "First I am going to ... ~ Əvvəlcə ... edəcəyəm",
 "After that I need to ... ~ Ondan sonra ... lazımdır",
 "At the moment I am working on ... ~ Hazırda ... üzərində işləyirəm",
 "Later today I will ... ~ Bu gün sonra ... edəcəyəm"]},

{"t":"Özün haqqında","lv":"A1","d":"Adın, işin, harada yaşadığın, nə ilə maraqlandığın. Müsahibənin ilk sualıdır — hazır olmalısan.","p":[
 "My name is ... and I am from ... ~ Adım ..., ...-danam",
 "I work as a ... at ... ~ ...-də ... işləyirəm",
 "I have been doing this for ... years. ~ Bununla ... ildir məşğulam",
 "In my free time I like ... ~ Boş vaxtımda ... xoşlayıram",
 "I am currently learning ... ~ Hazırda ... öyrənirəm"]},

{"t":"İş yerini təsvir et","lv":"A1","d":"Ofisin, komandan, iş günün necə keçir. There is / there are çox işlədəcəksən.","p":[
 "I work in a ... office. ~ ... ofisdə işləyirəm",
 "There are about ... people in my team. ~ Komandamda təxminən ... nəfər var",
 "My desk is next to ... ~ Masam ...-in yanındadır",
 "A typical day starts at ... ~ Adi gün ...-da başlayır",
 "The best part of my job is ... ~ İşimin ən yaxşı tərəfi ...-dir"]},

{"t":"Dünən nə etdin","lv":"A2","d":"Keçmiş zamanda danış. Past Simple və nizamsız felləri məşq et.","p":[
 "Yesterday I woke up at ... ~ Dünən ...-da oyandım",
 "In the morning I ... ~ Səhər ... etdim",
 "Then I went to ... ~ Sonra ...-a getdim",
 "It took me about ... hours. ~ Təxminən ... saat çəkdi",
 "By the end of the day I had ... ~ Günün sonunda ... etmişdim"]},

{"t":"Ailən haqqında","lv":"A2","d":"Ailə üzvləri, onların işi, nə vaxt görüşürsünüz.","p":[
 "There are ... of us in the family. ~ Ailəmizdə ... nəfərik",
 "My ... works as a ... ~ Mənim ...-m ... işləyir",
 "We usually meet on ... ~ Adətən ... günü görüşürük",
 "We get along very well. ~ Yaxşı yola gedirik",
 "He / She is the one who always ... ~ O, həmişə ... edən adamdır"]},

{"t":"Şəhərin haqqında","lv":"A2","d":"Bakını və ya yaşadığın yeri təsvir et. Turistə danışırmış kimi.","p":[
 "I live in ..., which is ... ~ ...-də yaşayıram, ora ...-dır",
 "It is famous for ... ~ Ora ... ilə məşhurdur",
 "The best time to visit is ... ~ Getmək üçün ən yaxşı vaxt ...-dır",
 "If you come here, you should definitely ... ~ Bura gəlsəniz, mütləq ... etməlisiniz",
 "One thing I do not like is ... ~ Xoşlamadığım bir şey ...-dır"]},

{"t":"Sevdiyin yemək","lv":"A2","d":"Bir yeməyi seç və necə hazırlandığını izah et. Ardıcıllıq sözlərini işlət.","p":[
 "My favourite dish is ... ~ Ən sevdiyim yemək ...-dır",
 "First you need to ... ~ Əvvəlcə ... lazımdır",
 "Then you add ... ~ Sonra ... əlavə edirsən",
 "It takes about ... minutes. ~ Təxminən ... dəqiqə çəkir",
 "It tastes ... ~ Dadı ...-dır"]},

{"t":"Bu həftə planların","lv":"A2","d":"Gələcək zamanı məşq et: will, going to və Present Continuous.","p":[
 "This week I am going to ... ~ Bu həftə ... edəcəyəm",
 "On Monday I am meeting ... ~ Bazar ertəsi ... ilə görüşürəm",
 "I hope I will finish ... ~ Ümid edirəm ...-i bitirəcəyəm",
 "If I have time, I will ... ~ Vaxtım olsa, ... edəcəyəm",
 "By Friday everything should be ... ~ Cüməyə qədər hər şey ... olmalıdır"]},

{"t":"Bir problemi izah et","lv":"B1","d":"İşdə qarşılaşdığın texniki problemi danış: nə oldu, səbəb nə idi, necə həll etdin.","p":[
 "Last week we ran into an issue with ... ~ Keçən həftə ... ilə problem yaşadıq",
 "At first we thought it was ... ~ Əvvəlcə düşündük ki, ...-dır",
 "It turned out that ... ~ Məlum oldu ki, ...",
 "The root cause was ... ~ Əsas səbəb ... idi",
 "In the end we managed to ... ~ Sonda ... bacardıq",
 "To prevent it happening again, we ... ~ Təkrarlanmasın deyə, ... etdik"]},

{"t":"Sənin işin nədən ibarətdir","lv":"B1","d":"Gündəlik məsuliyyətlərini izah et. Müsahibədə ən çox verilən suallardandır.","p":[
 "I am responsible for ... ~ ...-a görə məsulam",
 "My main task is to ... ~ Əsas vəzifəm ... etməkdir",
 "On a typical day I ... ~ Adi bir gündə ... edirəm",
 "I also coordinate with ... ~ Həmçinin ... ilə əlaqələndirirəm",
 "The most challenging part is ... ~ Ən çətin hissəsi ...-dır"]},

{"t":"Bir qərarı əsaslandır","lv":"B1","d":"Son vaxtlar verdiyin qərarı və səbəblərini izah et. Səbəb-nəticə bağlayıcılarını işlət.","p":[
 "We decided to ... because ... ~ ... qərarına gəldik, çünki ...",
 "The main reason was ... ~ Əsas səbəb ... idi",
 "We also took into account ... ~ Həmçinin ...-i nəzərə aldıq",
 "The alternative would have been ... ~ Alternativ ... olardı",
 "Looking back, I think it was the right call. ~ Geriyə baxanda düzgün qərar idi"]},

{"t":"İki variantı müqayisə et","lv":"B1","d":"İki məhsulu, yanaşmanı və ya şəhəri müqayisə et. Müqayisə dərəcələrini işlət.","p":[
 "Compared to ..., this one is ... ~ ... ilə müqayisədə bu ...-dır",
 "The main advantage is that ... ~ Əsas üstünlüyü odur ki, ...",
 "On the other hand, it is ... ~ Digər tərəfdən, o ...-dır",
 "It is not as ... as ... ~ O, ... qədər ... deyil",
 "Overall, I would go with ... ~ Ümumilikdə, ...-i seçərdim"]},

{"t":"Xəbərləri şərh et","lv":"B1","d":"Bu gün oxuduğun bir xəbəri qısaca danış və fikrini bildir.","p":[
 "I read an article about ... ~ ... haqqında məqalə oxudum",
 "Apparently, ... ~ Görünür, ...",
 "What surprised me was ... ~ Məni təəccübləndirən ... oldu",
 "In my opinion, this means ... ~ Fikrimcə, bu o deməkdir ki, ...",
 "It will probably affect ... ~ Bu, çox güman ...-a təsir edəcək"]},

{"t":"Gələcək planların","lv":"B1","d":"Növbəti 2-3 il üçün karyera və şəxsi hədəflərin.","p":[
 "In the next few years I would like to ... ~ Növbəti bir neçə ildə ... istərdim",
 "My long-term goal is to ... ~ Uzunmüddətli hədəfim ... etməkdir",
 "To get there, I need to ... ~ Buna çatmaq üçün ... lazımdır",
 "I am currently working towards ... ~ Hazırda ... üzərində çalışıram",
 "Ideally, by ... I will have ... ~ İdeal halda ...-a qədər ... edəcəyəm"]},

{"t":"Öyrəndiyin bacarıq","lv":"B1","d":"Yeni öyrəndiyin bir şeyi və necə öyrəndiyini danış.","p":[
 "I have been learning ... for ... ~ ...-dir ... öyrənirəm",
 "I started because ... ~ ...-a görə başladım",
 "The hardest part was ... ~ Ən çətin hissə ... idi",
 "What helped me most was ... ~ Ən çox kömək edən ... oldu",
 "I still struggle with ... ~ Hələ də ... ilə çətinlik çəkirəm"]},

{"t":"Uzaqdan iş — arqumentlər","lv":"B2","d":"Uzaqdan işin lehinə və əleyhinə arqumentlər gətir, sonra öz mövqeyini bildir.","p":[
 "There are strong arguments on both sides. ~ Hər iki tərəfdə güclü arqumentlər var",
 "Those in favour argue that ... ~ Tərəfdarlar deyir ki, ...",
 "However, critics point out that ... ~ Lakin tənqidçilər qeyd edir ki, ...",
 "Personally, I lean towards ... ~ Şəxsən mən ...-a meylliyəm",
 "That said, it depends largely on ... ~ Bununla belə, bu, əsasən ...-dan asılıdır"]},

{"t":"Layihəni təqdim et","lv":"B2","d":"İşlədiyin bir layihəni təqdim et: məqsəd, addımlar, nəticə. Struktur vacibdir.","p":[
 "The aim of the project was to ... ~ Layihənin məqsədi ... idi",
 "We approached it in three stages. ~ Buna üç mərhələdə yanaşdıq",
 "The first stage involved ... ~ Birinci mərhələ ...-i əhatə edirdi",
 "One challenge we faced was ... ~ Qarşılaşdığımız çətinlik ... idi",
 "As a result, we reduced ... by ... percent. ~ Nəticədə ...-i ... faiz azaltdıq",
 "Going forward, the next step is ... ~ Bundan sonra növbəti addım ...-dır"]},

{"t":"Fikrini müdafiə et","lv":"B2","d":"Mübahisəli mövzuda mövqe seç və üç arqumentlə əsaslandır.","p":[
 "I firmly believe that ... ~ Möhkəm inanıram ki, ...",
 "There are three reasons for this. ~ Bunun üç səbəbi var",
 "First and foremost, ... ~ Ən əsası, ...",
 "Secondly, ... ~ İkincisi, ...",
 "Finally, and perhaps most importantly, ... ~ Nəhayət, bəlkə də ən vacibi, ...",
 "For these reasons, I would argue that ... ~ Bu səbəblərdən deyərdim ki, ..."]},

{"t":"Səhvdən öyrənmək","lv":"B2","d":"Etdiyin bir səhvi və ondan nə öyrəndiyini danış. Modal perfect məşq et.","p":[
 "Looking back, I should have ... ~ Geriyə baxanda ... etməli idim",
 "At the time it seemed like ... ~ O vaxt elə görünürdü ki, ...",
 "If I had known ..., I would have ... ~ ...-i bilsəydim, ... edərdim",
 "The lesson I took from it was ... ~ Ondan çıxardığım dərs ... oldu",
 "Since then, I always ... ~ O vaxtdan həmişə ... edirəm"]},

{"t":"Texnologiyanın təsiri","lv":"B2","d":"Bir texnologiyanın sənin sahənə təsirini təhlil et.","p":[
 "Over the past few years, ... has transformed ... ~ Son bir neçə ildə ... ...-i dəyişdi",
 "The most significant impact has been on ... ~ Ən böyük təsir ...-a olub",
 "On the positive side, ... ~ Müsbət tərəfdən, ...",
 "At the same time, it raises concerns about ... ~ Eyni zamanda, ... barədə narahatlıq yaradır",
 "It remains to be seen whether ... ~ ... olub-olmayacağı hələ məlum deyil"]},
]
