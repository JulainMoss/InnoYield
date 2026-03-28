import { Idea, Bet, MarketItem, User } from "./types";

export const MOCK_USER: User = {
  id: "user-1",
  username: "Kaziu",
  email: "kaziu@example.com",
  coin_balance: 20,
};

export const MOCK_IDEAS: Idea[] = [
  {
    id: "idea-1",
    title: "Kaziu uruchomi aplikację do śledzenia nawyków żywieniowych w ciągu 30 dni",
    description:
      "Platforma mobilna wspierająca użytkowników w monitorowaniu codziennych posiłków z rekomendacjami AI oraz integracją z urządzeniami noszonymi.",
    milestone: "Opublikuje działający MVP w App Store",
    creator_username: "Kaziu",
    creator_id: "user-1",
    status: "VALIDATED",
    validation_score: 43,
    yes_pool: 340,
    no_pool: 120,
    category: "HealthTech",
    hat_scores: [
      { hat_color: "WHITE", score: 8, reasoning: "Rynek aplikacji zdrowotnych rośnie 20% rocznie. Istnieje solidna baza danych o skuteczności takich rozwiązań." },
      { hat_color: "RED", score: 7, reasoning: "Pomysł wywołuje entuzjazm. Ludzie coraz bardziej świadomie podchodzą do zdrowia i chcą narzędzi do jego śledzenia." },
      { hat_color: "BLACK", score: 6, reasoning: "Ryzyko: nasycony rynek (MyFitnessPal, Cronometer). Wymaga stałego zaangażowania użytkownika. Ograniczony czas na MVP." },
      { hat_color: "YELLOW", score: 9, reasoning: "Ogromny potencjał: subskrypcje, B2B z ubezpieczycielami, partnerstwa z producentami żywności." },
      { hat_color: "GREEN", score: 6, reasoning: "Innowacja poprzez AI-coaching, ale sama koncepcja nie jest nowa. Wyróżnik musi być wyraźny." },
      { hat_color: "BLUE", score: 7, reasoning: "Twórca ma doświadczenie techniczne. Plan 30-dniowy jest ambitny, ale wykonalny dla MVP." },
    ],
    created_at: "2026-03-01T10:00:00Z",
    market_closes_at: "2026-03-31T10:00:00Z",
  },
  {
    id: "idea-2",
    title: "Magda zbuduje marketplace dla lokalnych rzemieślników w Polsce w 30 dni",
    description:
      "Platforma e-commerce łącząca lokalnych rzemieślników z kupującymi, z funkcją personalizacji zamówień i dostawa następnego dnia.",
    milestone: "Zarejestruje 50 sprzedawców i przeprowadzi pierwsze 10 transakcji",
    creator_username: "Magda",
    creator_id: "user-2",
    status: "VALIDATED",
    validation_score: 39,
    yes_pool: 210,
    no_pool: 290,
    category: "E-commerce",
    hat_scores: [
      { hat_color: "WHITE", score: 7, reasoning: "Polskie rękodzieło jest cenione. Brak dominującej polskiej platformy dla rzemieślników. Etsy jest zbyt globalny." },
      { hat_color: "RED", score: 8, reasoning: "Silny sentyment do lokalności i autentyczności. Trend na produkty handmade bardzo mocny post-COVID." },
      { hat_color: "BLACK", score: 5, reasoning: "Pozyskanie 50 sprzedawców w 30 dni jest trudne. Logistyka i trust-building to realne wyzwania." },
      { hat_color: "YELLOW", score: 7, reasoning: "Niszowy rynek o wysokiej lojalności klientów. Marże na premium handmade są wysokie." },
      { hat_color: "GREEN", score: 5, reasoning: "Koncepcja nie jest innowacyjna, ale lokalizacja na Polskę to realna nisza." },
      { hat_color: "BLUE", score: 7, reasoning: "Milestone jest konkretny i mierzalny. Magda ma doświadczenie w e-commerce." },
    ],
    created_at: "2026-03-05T14:00:00Z",
    market_closes_at: "2026-04-04T14:00:00Z",
  },
  {
    id: "idea-3",
    title: "Piotrek stworzy narzędzie do automatyzacji raportów dla MŚP w 30 dni",
    description:
      "SaaS łączący dane z Excela, systemów ERP i bankowości online, generujący automatyczne raporty zarządcze bez potrzeby znajomości SQL.",
    milestone: "Wdroży u 3 płacących klientów i zbierze pierwsze przychody",
    creator_username: "Piotrek",
    creator_id: "user-3",
    status: "VALIDATED",
    validation_score: 47,
    yes_pool: 580,
    no_pool: 180,
    category: "B2B SaaS",
    hat_scores: [
      { hat_color: "WHITE", score: 9, reasoning: "MŚP tracą średnio 8h/tydzień na ręczne raporty. Rynek automatyzacji B2B wart $5B w Polsce do 2025." },
      { hat_color: "RED", score: 7, reasoning: "Rozwiązuje realny ból. Każdy właściciel firmy zna frustrację z Excelem i raportami." },
      { hat_color: "BLACK", score: 7, reasoning: "Integracje z wieloma systemami to złożona praca. Sales cycle B2B może być dłuższy niż 30 dni." },
      { hat_color: "YELLOW", score: 9, reasoning: "Subscription model, upsell na zaawansowane analizy, partnerships z biurami rachunkowymi." },
      { hat_color: "GREEN", score: 8, reasoning: "No-code podejście to innowacja dla tej grupy. AI do interpretacji danych wyróżnia produkt." },
      { hat_color: "BLUE", score: 7, reasoning: "Piotrek ma 5 lat doświadczenia w B2B SaaS. Plan jest konkretny, 3 klientów w 30 dni to realne." },
    ],
    created_at: "2026-03-10T09:00:00Z",
    market_closes_at: "2026-04-09T09:00:00Z",
  },
  {
    id: "idea-4",
    title: "Ania uruchomi subskrypcję wegańskich meal kitów w Warszawie",
    description:
      "Cotygodniowe zestawy z lokalnymi, sezonowymi składnikami i przepisami na wegańskie dania. Partnerstwa z lokalnymi farmami.",
    milestone: "Pozyska 100 subskrybentów i zrealizuje pierwsze dostawy",
    creator_username: "Ania",
    creator_id: "user-4",
    status: "VALIDATED",
    validation_score: 36,
    yes_pool: 95,
    no_pool: 405,
    category: "FoodTech",
    hat_scores: [
      { hat_color: "WHITE", score: 6, reasoning: "Weganizm rośnie 15% rocznie w Polsce. Rynek meal kitów jest jednak słabo rozwinięty lokalnie." },
      { hat_color: "RED", score: 8, reasoning: "Trend na świadome jedzenie i sustainability jest bardzo silny wśród młodych Polaków." },
      { hat_color: "BLACK", score: 4, reasoning: "Logistyka chłodnicza jest kosztowna. 100 subskrybentów to ambitny cel. Dużo zależy od dostępności produktów." },
      { hat_color: "YELLOW", score: 6, reasoning: "Lojalność klientów meal kit jest wysoka po pierwszym miesiącu. Potencjał na skalowanie do innych miast." },
      { hat_color: "GREEN", score: 6, reasoning: "Lokalne farmy + wegańskie to ciekawe połączenie, ale rynek jest rozdrobniony." },
      { hat_color: "BLUE", score: 6, reasoning: "Ania ma doświadczenie w gastronomii. Operacje logistyczne mogą być wyzwaniem bez partnera." },
    ],
    created_at: "2026-03-12T11:00:00Z",
    market_closes_at: "2026-04-11T11:00:00Z",
  },
  {
    id: "idea-5",
    title: "Tomek stworzy platformę do nauki programowania przez gry dla dzieci",
    description:
      "Gamifikowana nauka kodowania dla dzieci 8-14 lat. Misje, nagrody, współzawodnictwo klasowe. Zgodna z podstawą programową.",
    milestone: "Przeprowadzi pilotaż w 5 szkołach z 200 uczniami",
    creator_username: "Tomek",
    creator_id: "user-5",
    status: "VALIDATED",
    validation_score: 51,
    yes_pool: 720,
    no_pool: 130,
    category: "EdTech",
    hat_scores: [
      { hat_color: "WHITE", score: 9, reasoning: "Programowanie wchodzi do polskich szkół od 2024. 4.5M uczniów podstawówek to ogromny rynek." },
      { hat_color: "RED", score: 9, reasoning: "Dzieci uwielbiają grać. Rodzice i nauczyciele szukają angażujących narzędzi edukacyjnych." },
      { hat_color: "BLACK", score: 8, reasoning: "Sprzedaż do szkół publicznych jest powolna (przetargi). Utrzymanie zaangażowania dzieci długoterminowo to wyzwanie." },
      { hat_color: "YELLOW", score: 9, reasoning: "Model B2B2C: licencje szkolne + premium dla rodziców. Potencjał eksportowy (rynki CEE)." },
      { hat_color: "GREEN", score: 8, reasoning: "Połączenie narracji RPG z programowaniem jest świeże na polskim rynku." },
      { hat_color: "BLUE", score: 8, reasoning: "Tomek jest byłym nauczycielem z doświadczeniem w gamedev. Pilotaż w 5 szkołach w 30 dni jest wykonalny." },
    ],
    created_at: "2026-03-15T16:00:00Z",
    market_closes_at: "2026-04-14T16:00:00Z",
  },
];

export const MOCK_BETS: Bet[] = [
  {
    id: "bet-1",
    idea_id: "idea-1",
    idea_title: "Kaziu uruchomi aplikację do śledzenia nawyków żywieniowych",
    idea_milestone: "Opublikuje działający MVP w App Store",
    position: "YES",
    amount: 5,
    created_at: "2026-03-20T12:00:00Z",
    market_closes_at: "2026-03-31T10:00:00Z",
    current_probability: 74,
  },
  {
    id: "bet-2",
    idea_id: "idea-3",
    idea_title: "Piotrek stworzy narzędzie do automatyzacji raportów dla MŚP",
    idea_milestone: "Wdroży u 3 płacących klientów",
    position: "YES",
    amount: 8,
    multiplier: 1.62,
    payout: 13,
    created_at: "2026-03-18T09:00:00Z",
    resolved_at: "2026-03-25T09:00:00Z",
    market_closes_at: "2026-04-09T09:00:00Z",
    current_probability: 76,
  },
];

export const MOCK_MARKET_ITEMS: MarketItem[] = [
  {
    id: "item-1",
    name: "Kawa w Starbucks",
    description: "Dowolny napój do 30 zł w Starbucks",
    price: 50,
    image_emoji: "☕",
    category: "Jedzenie",
    available: true,
  },
  {
    id: "item-2",
    name: "Żappsy 50 zł",
    description: "50 zł do wykorzystania w aplikacji Żabka",
    price: 120,
    image_emoji: "🛒",
    category: "Zakupy",
    available: true,
  },
  {
    id: "item-3",
    name: "Netflix 1 miesiąc",
    description: "Miesięczna subskrypcja Netflix Standard",
    price: 200,
    image_emoji: "🎬",
    category: "Rozrywka",
    available: true,
  },
  {
    id: "item-4",
    name: "Amazon Gift Card $10",
    description: "$10 do wydania na Amazon",
    price: 250,
    image_emoji: "📦",
    category: "Zakupy",
    available: true,
  },
  {
    id: "item-5",
    name: "Steam Wallet 50 zł",
    description: "50 zł do wydania na Steam",
    price: 150,
    image_emoji: "🎮",
    category: "Gaming",
    available: true,
  },
  {
    id: "item-6",
    name: "Audioteka Premium",
    description: "3 miesiące Audioteka Premium",
    price: 100,
    image_emoji: "🎧",
    category: "Rozrywka",
    available: true,
  },
  {
    id: "item-7",
    name: "Voucher Allegro 100 zł",
    description: "100 zł na zakupy w Allegro",
    price: 350,
    image_emoji: "🏷️",
    category: "Zakupy",
    available: true,
  },
  {
    id: "item-8",
    name: "Spotify Premium",
    description: "3 miesiące Spotify Premium",
    price: 90,
    image_emoji: "🎵",
    category: "Muzyka",
    available: true,
  },
];

// Mock API functions simulating backend calls
let currentUser = { ...MOCK_USER };
let ideas = [...MOCK_IDEAS];
let userBets = [...MOCK_BETS];

export const mockApi = {
  getUser: (): User => ({ ...currentUser }),

  getIdeas: (): Idea[] => ideas.filter((i) => i.status === "VALIDATED"),

  getIdea: (id: string): Idea | undefined => ideas.find((i) => i.id === id),

  getUserBets: (): Bet[] => userBets,

  getUserIdeas: (): Idea[] => ideas.filter((i) => i.creator_id === "user-1"),

  placeBet: (ideaId: string, position: "YES" | "NO", amount: number): { success: boolean; message: string } => {
    if (currentUser.coin_balance < amount) {
      return { success: false, message: "Niewystarczające środki" };
    }
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return { success: false, message: "Pomysł nie istnieje" };

    currentUser = { ...currentUser, coin_balance: currentUser.coin_balance - amount };

    if (position === "YES") {
      idea.yes_pool += amount;
    } else {
      idea.no_pool += amount;
    }

    const newBet: Bet = {
      id: `bet-${Date.now()}`,
      idea_id: ideaId,
      idea_title: idea.title,
      idea_milestone: idea.milestone,
      position,
      amount,
      created_at: new Date().toISOString(),
      market_closes_at: idea.market_closes_at,
      current_probability: Math.round((idea.yes_pool / (idea.yes_pool + idea.no_pool)) * 100),
    };
    userBets = [...userBets, newBet];

    return { success: true, message: "Zakład postawiony!" };
  },

  buyItem: (itemId: string): { success: boolean; message: string } => {
    const item = MOCK_MARKET_ITEMS.find((i) => i.id === itemId);
    if (!item) return { success: false, message: "Przedmiot nie istnieje" };
    if (currentUser.coin_balance < item.price) {
      return { success: false, message: `Potrzebujesz ${item.price - currentUser.coin_balance} więcej monet` };
    }
    currentUser = { ...currentUser, coin_balance: currentUser.coin_balance - item.price };
    return { success: true, message: `Kupiono: ${item.name}!` };
  },
};
