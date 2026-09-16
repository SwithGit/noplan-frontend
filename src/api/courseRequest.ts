import { API_BASE_URL, ApiError, apiJson } from './client';

export interface CourseProgress { stage: string; checked?: number; total?: number; examined?: number; verified?: number }

export async function requestCourse<T>(body: string, signal: AbortSignal, onProgress?: (progress: CourseProgress) => void): Promise<T> {
  const path='/api/course/generate/generate-course';
  if(!onProgress)return apiJson<T>(path,{method:'POST',body,signal});
  const response=await fetch(`${API_BASE_URL}${path}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body,signal});
  if(!response.headers.get('Content-Type')?.includes('application/x-ndjson')){
    const data=await response.json();
    if(!response.ok)throw new ApiError(data.message||'코스 조회 실패',response.status,data);
    return data as T;
  }
  const reader=response.body?.getReader();
  if(!reader)throw new Error('진행 응답을 받지 못했어요.');
  const decoder=new TextDecoder();let buffer='';
  try{
    while(true){
      const {value,done}=await reader.read();
      buffer+=decoder.decode(value,{stream:!done});
      const lines=buffer.split('\n');buffer=lines.pop()||'';
      for(const line of lines){
        if(!line.trim())continue;
        const event=JSON.parse(line);
        if(event.type==='progress')onProgress(event as CourseProgress);
        if(event.type==='result'){
          if(event.status>=400)throw new ApiError(event.body?.message||'코스 조회 실패',event.status,event.body);
          return event.body as T;
        }
      }
      if(done)throw new Error('검증 응답이 중간에 끊겼어요. 다시 시도해 주세요.');
    }
  }finally{reader.releaseLock();}
}
