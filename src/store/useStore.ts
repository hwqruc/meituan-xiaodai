import { createContext, useContext, type Dispatch, type ReactNode } from 'react';
import type { AddonOption } from '../tools/addon';
import type {
  Message, Plan, PlanConstraint, AppPhase, TabId,
  Activity, Restaurant, CouponMatch,
  WeatherInfo,
} from '../types';

export type PlanningStep =
  | 'init'
  | 'picking_activity'
  | 'activity_selected'
  | 'picking_restaurant'
  | 'completed';

export interface PendingMerchant {
  id: string;
  type: 'activity' | 'restaurant';
  name: string;
  price: number;
  groupPrice: number;
  rating: number;
  imageUrl: string;
  tags: string[];
  detail: string;
}

export interface AppState {
  phase: AppPhase;
  tab: TabId;
  messages: Message[];
  constraint: Partial<PlanConstraint>;
  plan: Plan | null;
  activityCategories: string[];
  restaurantCategories: string[];
  currentActivities: Activity[];
  currentRestaurants: Restaurant[];
  selectedActivities: Activity[];
  selectedRestaurant: Restaurant | null;
  activeAddon: (AddonOption & { type: string }) | null;
  pendingMerchant: PendingMerchant | null;
  weather: WeatherInfo | null;
  pinChangSessions: Array<{
    id: string; name: string; category: string; timeSlot: string; date: string;
    price: number; currentCount: number; maxCount: number; location: string;
    difficulty: string; equipment: string; tags: string[]; rating: number;
    durationMin: number; host: string; hostVerified: boolean;
  }>;
  isLoading: boolean;
  onboardingStep: number;
  planningStep: PlanningStep;
  remainingBudget: number | null;
}

export type AppAction =
  | { type: 'SET_PHASE'; phase: AppPhase }
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_CONSTRAINT'; constraint: Partial<PlanConstraint> }
  | { type: 'SET_PLAN'; plan: Plan | null }
  | { type: 'SET_ACTIVITY_CATEGORIES'; categories: string[] }
  | { type: 'SET_RESTAURANT_CATEGORIES'; categories: string[] }
  | { type: 'SET_CURRENT_ACTIVITIES'; activities: Activity[] }
  | { type: 'SET_CURRENT_RESTAURANTS'; restaurants: Restaurant[] }
  | { type: 'ADD_SELECTED_ACTIVITY'; activity: Activity }
  | { type: 'REMOVE_SELECTED_ACTIVITY'; activityId: string }
  | { type: 'CLEAR_SELECTED_ACTIVITIES' }
  | { type: 'SET_SELECTED_RESTAURANT'; restaurant: Restaurant | null }
  | { type: 'SET_WEATHER'; weather: WeatherInfo | null }
  | { type: 'SET_ACTIVE_ADDON'; addon: (AddonOption & { type: string }) | null }
  | { type: 'SET_PENDING_MERCHANT'; merchant: PendingMerchant | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ONBOARDING_STEP'; step: number }
  | { type: 'SET_PLANNING_STEP'; step: PlanningStep }
  | { type: 'SET_REMAINING_BUDGET'; budget: number | null }
  | { type: 'SET_PINCHANG_SESSIONS'; sessions: AppState['pinChangSessions'] }
  | { type: 'RESET' };

export const initialState: AppState = {
  phase: 'home',
  tab: 'chat',
  messages: [
    {
      id: 'welcome',
      role: 'agent',
      text: 'Hi, 我是美团小袋 🦘\n\n我能帮你：完整规划行程 · 美团拼场找搭子 · 自动匹配优惠券 · 一键购票订座 · 闪送到指定地点 · 分享方案给朋友\n\n说说你的想法，比如时间、几个人、想玩什么，我帮你安排～',
      timestamp: Date.now(),
    },
  ],
  constraint: {},
  plan: null,
  activityCategories: [],
  restaurantCategories: [],
  currentActivities: [],
  currentRestaurants: [],
  selectedActivities: [],
  selectedRestaurant: null,
  activeAddon: null,
  pendingMerchant: null,
  weather: null,
  pinChangSessions: [],
  isLoading: false,
  onboardingStep: 0,
  planningStep: 'init',
  remainingBudget: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_TAB':
      return { ...state, tab: action.tab };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'SET_CONSTRAINT':
      return { ...state, constraint: { ...state.constraint, ...action.constraint } };
    case 'SET_PLAN':
      return { ...state, plan: action.plan };
    case 'SET_ACTIVITY_CATEGORIES':
      return { ...state, activityCategories: action.categories };
    case 'SET_RESTAURANT_CATEGORIES':
      return { ...state, restaurantCategories: action.categories };
    case 'SET_CURRENT_ACTIVITIES':
      return { ...state, currentActivities: action.activities };
    case 'SET_CURRENT_RESTAURANTS':
      return { ...state, currentRestaurants: action.restaurants };
    case 'ADD_SELECTED_ACTIVITY':
      return { ...state, selectedActivities: [...state.selectedActivities, action.activity] };
    case 'REMOVE_SELECTED_ACTIVITY':
      return { ...state, selectedActivities: state.selectedActivities.filter((a) => a.id !== action.activityId) };
    case 'CLEAR_SELECTED_ACTIVITIES':
      return { ...state, selectedActivities: [] };
    case 'SET_SELECTED_RESTAURANT':
      return { ...state, selectedRestaurant: action.restaurant };
    case 'SET_WEATHER':
      return { ...state, weather: action.weather };
    case 'SET_ACTIVE_ADDON':
      return { ...state, activeAddon: action.addon };
    case 'SET_PENDING_MERCHANT':
      return { ...state, pendingMerchant: action.merchant };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ONBOARDING_STEP':
      return { ...state, onboardingStep: action.step };
    case 'SET_PLANNING_STEP':
      return { ...state, planningStep: action.step };
    case 'SET_REMAINING_BUDGET':
      return { ...state, remainingBudget: action.remainingBudget };
    case 'SET_PINCHANG_SESSIONS':
      return { ...state, pinChangSessions: action.sessions };
    case 'RESET':
      return {
        ...initialState,
        messages: [
          {
            id: 'welcome-reset',
            role: 'agent',
            text: '还想安排点什么？规划行程、拼场找搭子、匹配优惠券、一键下单，随时跟我说～',
            timestamp: Date.now(),
          },
        ],
        planningStep: 'init',
        selectedActivities: [],
        remainingBudget: null,
        weather: null,
      };
    default:
      return state;
  }
}

export const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => {} });

export function useAppState() {
  return useContext(AppContext);
}
