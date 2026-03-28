export type HatColor = "WHITE" | "RED" | "BLACK" | "YELLOW" | "GREEN" | "BLUE";

export type IdeaStatus = "PENDING" | "VALIDATED" | "REJECTED" | "RESOLVED";

export type BetPosition = "YES" | "NO";

export interface HatScore {
  hat_color: HatColor;
  score: number;
  reasoning: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  milestone: string;
  creator_username: string;
  creator_id: string;
  status: IdeaStatus;
  validation_score: number;
  yes_pool: number;
  no_pool: number;
  hat_scores: HatScore[];
  created_at: string;
  market_closes_at: string;
  outcome?: BetPosition | null;
  category: string;
}

export interface Bet {
  id: string;
  idea_id: string;
  idea_title: string;
  idea_milestone: string;
  position: BetPosition;
  amount: number;
  multiplier?: number;
  payout?: number;
  created_at: string;
  resolved_at?: string;
  market_closes_at: string;
  current_probability: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  coin_balance: number;
}

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_emoji: string;
  category: string;
  available: boolean;
}
