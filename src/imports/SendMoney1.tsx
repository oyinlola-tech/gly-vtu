import svgPaths from "./svg-64tho7mni2";
import imgENairaLogo2 from "figma:asset/61cbe5280662981bea16f7f38bf0c960e6771934.png";

function Notch() {
  return (
    <div className="-translate-x-1/2 absolute h-[30px] left-1/2 top-[-2px] w-[219px]" data-name="Notch">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 219 30">
        <g id="Notch">
          <path d={svgPaths.p7f98200} fill="var(--fill-0, black)" id="Notch_2" />
        </g>
      </svg>
    </div>
  );
}

function RightSide() {
  return (
    <div className="absolute h-[11.336px] right-[14.67px] top-[17.33px] w-[66.661px]" data-name="Right Side">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 66.6612 11.3359">
        <g id="Right Side">
          <g id="Battery">
            <path d={svgPaths.p2bcf2900} id="Rectangle" opacity="0.35" stroke="var(--stroke-0, white)" />
            <path d={svgPaths.p32eac000} fill="var(--fill-0, white)" id="Combined Shape" opacity="0.4" />
            <path d={svgPaths.pb5036c0} fill="var(--fill-0, white)" id="Rectangle_2" />
          </g>
          <path clipRule="evenodd" d={svgPaths.p1d7c8600} fill="var(--fill-0, white)" fillRule="evenodd" id="Wifi" />
          <path clipRule="evenodd" d={svgPaths.p3e2de00} fill="var(--fill-0, white)" fillRule="evenodd" id="Mobile Signal" />
        </g>
      </svg>
    </div>
  );
}

function LeftSide() {
  return (
    <div className="absolute contents left-[21px] top-[12px]" data-name="Left Side">
      <div className="absolute h-[21px] left-[21px] rounded-[24px] top-[12px] w-[54px]" data-name="_StatusBar-time">
        <p className="-translate-x-1/2 absolute font-['SF_Pro_Text:Semibold',sans-serif] h-[20px] leading-[20px] left-[27px] not-italic text-[15px] text-center text-white top-px tracking-[-0.5px] w-[54px]">9:41</p>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="-translate-x-1/2 absolute bg-gradient-to-l from-[#235697] from-[1.194%] h-[260px] left-1/2 to-[#114280] top-0 w-[375px]">
      <div className="absolute h-[44px] left-0 overflow-clip top-0 w-[375px]" data-name="StatusBar / iPhone X (or newer)">
        <Notch />
        <RightSide />
        <LeftSide />
      </div>
    </div>
  );
}

function CaretLeft() {
  return (
    <div className="-translate-y-1/2 absolute left-[20px] size-[20px] top-[calc(50%+0.5px)]" data-name="CaretLeft">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="CaretLeft">
          <path d={svgPaths.p10be5e00} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function ChatDots() {
  return (
    <div className="-translate-y-1/2 absolute right-[20px] size-[20px] top-[calc(50%+0.5px)]" data-name="ChatDots">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="ChatDots">
          <path d={svgPaths.p23bb3800} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute border-[#f3f3f3] border-b border-solid h-[50px] left-0 overflow-clip top-0 w-[375px]">
      <p className="-translate-x-1/2 absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-1/2 not-italic overflow-hidden text-[#3a3c4c] text-[15px] text-center text-ellipsis top-[calc(50%-11px)] tracking-[-0.3px] w-[209px] whitespace-nowrap">Send Money</p>
      <CaretLeft />
      <ChatDots />
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-y-1/2 absolute left-[20px] size-[40px] top-1/2">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
        <g id="Frame 427319554">
          <rect fill="var(--fill-0, #F1F5F9)" height="40" rx="20" width="40" />
          <path d={svgPaths.p3d9afc80} fill="url(#paint0_linear_1_6588)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6588" x1="29.7612" x2="10" y1="10" y2="10">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">Swift Pay User</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Send to a Swift Pay User or invite phone contact</p>
    </div>
  );
}

function CaretRight() {
  return (
    <div className="-translate-y-1/2 absolute right-[20px] size-[15px] top-1/2" data-name="CaretRight">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="CaretRight">
          <path d={svgPaths.p14e4ca00} fill="var(--fill-0, #7D7C93)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame6() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[74px] w-[375px]">
      <Frame />
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame7 />
      <CaretRight />
    </div>
  );
}

function Frame8() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[8px] items-center left-1/2 top-[208px]">
      <div className="h-0 relative shrink-0 w-[82px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 82 1">
            <line id="Line 252" stroke="var(--stroke-0, #D5D5D5)" x2="82" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#d5d5d5] text-[12px] text-center tracking-[-0.24px] whitespace-nowrap">OR</p>
      <div className="h-0 relative shrink-0 w-[82px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 82 1">
            <line id="Line 252" stroke="var(--stroke-0, #D5D5D5)" x2="82" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Bank() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[20px] top-1/2" data-name="Bank">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Bank">
          <path d={svgPaths.p233a2d00} fill="url(#paint0_linear_1_6570)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6570" x1="19.1511" x2="0.625" y1="1.87539" y2="1.87539">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[50px] size-[40px] top-1/2">
      <Bank />
    </div>
  );
}

function Frame9() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">Bank Account</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Send to a bank account</p>
    </div>
  );
}

function CaretRight1() {
  return (
    <div className="-translate-y-1/2 absolute right-[20px] size-[15px] top-1/2" data-name="CaretRight">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="CaretRight">
          <path d={svgPaths.p14e4ca00} fill="var(--fill-0, #7D7C93)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame10() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[138px] w-[375px]">
      <Frame1 />
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame9 />
      <CaretRight1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[50px] size-[40px] top-1/2">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[16px] left-1/2 top-1/2 w-[20px]" data-name="e-naira-logo 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgENairaLogo2} />
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">eNaira</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Send to eNaira account</p>
    </div>
  );
}

function CaretRight2() {
  return (
    <div className="-translate-y-1/2 absolute right-[20px] size-[15px] top-1/2" data-name="CaretRight">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="CaretRight">
          <path d={svgPaths.p14e4ca00} fill="var(--fill-0, #7D7C93)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame11() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[232px] w-[375px]">
      <Frame2 />
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame12 />
      <CaretRight2 />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-0 top-[74px]">
      <Frame6 />
      <Frame8 />
      <Frame10 />
      <Frame11 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[744px] left-1/2 overflow-clip rounded-[16px] top-[68px] w-[375px]">
      <Frame4 />
      <Group />
    </div>
  );
}

export default function SendMoney() {
  return (
    <div className="bg-white relative size-full" data-name="Send Money 1">
      <div className="absolute bottom-0 h-[34px] left-0 w-[375px]" data-name="Home Indicator">
        <div className="-translate-x-1/2 absolute bg-black bottom-[8px] h-[5px] left-[calc(50%+0.5px)] rounded-[100px] w-[134px]" data-name="Home Indicator" />
      </div>
      <Frame5 />
      <Frame3 />
    </div>
  );
}