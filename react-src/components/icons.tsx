// All SVG icons used across the plugin UI.
// Each component accepts an optional className prop for size/color overrides.

interface IconProps {
  className?: string;
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 12 14" fill="none">
      <path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/>
    </svg>
  );
}

export function IconMore({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 8C3 7.44772 3.44772 7 4 7C4.55228 7 5 7.44772 5 8C5 8.55228 4.55228 9 4 9C3.44772 9 3 8.55228 3 8ZM7 8C7 7.44772 7.44772 7 8 7C8.55229 7 9 7.44772 9 8C9 8.55228 8.55229 9 8 9C7.44772 9 7 8.55228 7 8ZM11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8Z"/>
    </svg>
  );
}

export function IconImport({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12.5 8.5C12.5 7.94772 12.0523 7.5 11.5 7.5V11.5C11.5 12.6046 10.6046 13.5 9.5 13.5H5.5C5.5 14.0523 5.94772 14.5 6.5 14.5H11.5C12.0523 14.5 12.5 14.0523 12.5 13.5V8.5ZM6.5 1C6.5 0.723858 6.72386 0.5 7 0.5C7.27614 0.5 7.5 0.723858 7.5 1V8.29297L8.64648 7.14648C8.84175 6.95122 9.15825 6.95122 9.35352 7.14648C9.54878 7.34175 9.54878 7.65825 9.35352 7.85352L7.35352 9.85352C7.25975 9.94728 7.13261 10 7 10C6.86739 10 6.74025 9.94728 6.64648 9.85352L4.64648 7.85352C4.45122 7.65825 4.45122 7.34175 4.64648 7.14648C4.84175 6.95122 5.15825 6.95122 5.35352 7.14648L6.5 8.29297V1ZM13.5 13.5C13.5 14.6046 12.6046 15.5 11.5 15.5H6.5C5.39543 15.5 4.5 14.6046 4.5 13.5C3.39543 13.5 2.5 12.6046 2.5 11.5V6.5C2.5 5.39543 3.39543 4.5 4.5 4.5H5C5.27614 4.5 5.5 4.72386 5.5 5C5.5 5.27614 5.27614 5.5 5 5.5H4.5C3.94772 5.5 3.5 5.94772 3.5 6.5V11.5C3.5 12.0523 3.94772 12.5 4.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6.5C10.5 5.94772 10.0523 5.5 9.5 5.5H9C8.72386 5.5 8.5 5.27614 8.5 5C8.5 4.72386 8.72386 4.5 9 4.5H9.5C10.6046 4.5 11.5 5.39543 11.5 6.5C12.6046 6.5 13.5 7.39543 13.5 8.5V13.5Z" fill="currentColor"/>
    </svg>
  );
}

export function IconPreview({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export function IconRun({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="white">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3.76846C3 2.8177 4.01933 2.215 4.8524 2.67319L12.5461 6.90474C13.4096 7.37964 13.4096 8.62037 12.5461 9.09527L4.8524 13.3268C4.01933 13.785 3 13.1823 3 12.2316V3.76846Z"/>
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export function IconSave({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

export function IconCode({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}

export function IconFile({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  );
}

export function IconLayers({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

export function IconTrashLarge({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  );
}

export function IconBookmark({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg className={className} width="14" height="8" viewBox="0 0 14 8" fill="none">
      <path d="M7.26974 7.35999C7.02426 7.56025 6.66199 7.54569 6.43315 7.31686L0.183152 1.06686C-0.0609254 0.822781 -0.0609255 0.427147 0.183152 0.183069C0.427229 -0.0610085 0.822864 -0.0610085 1.06694 0.183069L6.87505 5.99117L12.6832 0.183069C12.9272 -0.0610087 13.3229 -0.0610087 13.5669 0.183069C13.811 0.427146 13.811 0.822781 13.5669 1.06686L7.31694 7.31686L7.26974 7.35999Z" fill="#ECEEF1"/>
    </svg>
  );
}

export function IconAlertTriangle({ className }: IconProps) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

export function IconCog({ className }: IconProps) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M12 6.13542C12 6.01321 11.9116 5.90876 11.791 5.88867L11.1953 5.78971C10.7136 5.70943 10.3599 5.36233 10.196 4.96745C10.0306 4.56911 10.04 4.07821 10.3223 3.68294L10.6738 3.19076C10.7448 3.09132 10.7335 2.95487 10.6471 2.86849L10.1315 2.35286C10.0451 2.26652 9.90867 2.25522 9.80925 2.32617L9.31771 2.67773C8.92232 2.96016 8.43103 2.96948 8.03255 2.80404C7.63764 2.64005 7.29058 2.28647 7.21029 1.80469L7.11133 1.20898C7.09124 1.08844 6.98679 1 6.86458 1H6.13542C6.01321 1 5.90876 1.08844 5.88867 1.20898L5.78971 1.80469C5.70942 2.28643 5.36234 2.64009 4.96745 2.80404C4.56911 2.9694 4.07822 2.95995 3.68294 2.67773L3.19076 2.32617C3.09141 2.25538 2.9555 2.26672 2.86914 2.35286L2.35286 2.86849C2.26648 2.95491 2.2558 3.09132 2.32682 3.19076L2.67773 3.68229C2.96016 4.07768 2.96948 4.56897 2.80404 4.96745C2.64005 5.36236 2.28647 5.70942 1.80469 5.78971L1.20898 5.88867C1.08844 5.90876 1 6.01321 1 6.13542V6.86458C1 6.98679 1.08844 7.09124 1.20898 7.11133L1.80469 7.21029C2.28642 7.29058 2.64009 7.63766 2.80404 8.03255C2.9694 8.43089 2.95996 8.92179 2.67773 9.31706L2.32617 9.80925C2.25522 9.90868 2.26648 10.0451 2.35286 10.1315L2.86849 10.6471C2.95489 10.7335 3.09133 10.7448 3.19076 10.6738L3.68229 10.3223C4.07767 10.0399 4.56898 10.0305 4.96745 10.196C5.36236 10.3599 5.70942 10.7135 5.78971 11.1953L5.88867 11.791C5.90876 11.9116 6.01321 12 6.13542 12H6.86458C6.98679 12 7.09124 11.9116 7.11133 11.791L7.21029 11.1953C7.29058 10.7136 7.63765 10.3599 8.03255 10.196C8.43089 10.0306 8.92177 10.0401 9.31706 10.3223L9.80925 10.6738C9.90858 10.7446 10.0445 10.7333 10.1309 10.6471L10.6471 10.1315C10.7335 10.0452 10.7447 9.90867 10.6738 9.80925L10.3223 9.31771C10.0399 8.92233 10.0305 8.43102 10.196 8.03255C10.3599 7.63764 10.7135 7.29058 11.1953 7.21029L11.791 7.11133C11.9116 7.09124 12 6.98679 12 6.86458V6.13542ZM8.00065 6.5C8.00064 5.67164 7.32899 5.0001 6.50065 5C5.67223 5 5.00066 5.67158 5.00065 6.5C5.00065 7.32843 5.67222 8 6.50065 8C7.32899 7.9999 8.00065 7.32837 8.00065 6.5Z" fill="currentColor"/>
    </svg>
  );
}
