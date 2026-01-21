"use client";
export default function Error({error}:{error:Error}){return <div className='p-6 text-red-300'>{error.message}</div>}
