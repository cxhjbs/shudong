export type Mood='happy'|'sad'|'calm'|'angry'|'tired'|'excited';
export type Weather='sunny'|'cloudy'|'rainy'|'snowy'|'windy';
export type Diary={id:string;user_id:string;title:string;content:string;mood:Mood;weather:Weather|null;image_paths:string[];diary_date:string;created_at:string;updated_at:string};
export type Database={public:{Tables:{diaries:{Row:Diary;Insert:Omit<Diary,'id'|'created_at'|'updated_at'> & {id?:string};Update:Partial<Diary>};settings:{Row:{user_id:string;display_name:string|null;theme:'light'|'dark'|'system';lock_timeout_seconds:number;created_at:string;updated_at:string};Insert:{user_id:string;display_name?:string;theme?:'light'|'dark'|'system';lock_timeout_seconds?:number};Update:Record<string,unknown>}}}};
