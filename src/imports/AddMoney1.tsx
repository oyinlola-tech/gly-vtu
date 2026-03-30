import svgPaths from "./svg-5dxrdqcxaq";

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

function Frame4() {
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
    <button className="-translate-y-1/2 absolute block cursor-pointer left-[20px] size-[20px] top-[calc(50%+0.5px)]" data-name="CaretLeft">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="CaretLeft">
          <path d={svgPaths.p10be5e00} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </button>
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

function Frame6() {
  return (
    <div className="absolute border-[#f3f3f3] border-b border-solid h-[50px] left-0 overflow-clip top-0 w-[375px]">
      <p className="-translate-x-1/2 absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-1/2 not-italic overflow-hidden text-[#3a3c4c] text-[15px] text-center text-ellipsis top-[calc(50%-11px)] tracking-[-0.3px] w-[209px] whitespace-nowrap">Add Money</p>
      <CaretLeft />
      <ChatDots />
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

function Frame10() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">Bank Transfer</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Add money via mobile or internet banking</p>
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

function Frame7() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[74px] w-[375px]">
      <Frame1 />
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" strokeDasharray="2 2" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame10 />
      <CaretRight />
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[44px] left-[calc(50%-87.5px)] rounded-[8px] top-[86px] w-[160px]">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-center px-[128px] py-[16px] relative size-full">
          <p className="bg-clip-text bg-gradient-to-l font-['Basis_Grotesque_Pro:Medium',sans-serif] from-[#235697] from-[1.194%] leading-[1.4] not-italic relative shrink-0 text-[14px] text-[transparent] text-center to-[#114280] tracking-[-0.28px] whitespace-nowrap">Copy Number</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#235697] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Frame8() {
  return (
    <div className="absolute bg-white h-[155px] left-0 overflow-clip top-[138px] w-[375px]">
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" strokeDasharray="2 2" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <p className="absolute font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] left-[20px] not-italic text-[#7d7c93] text-[12px] top-[20px] tracking-[-0.24px] whitespace-nowrap">Swift Pay Account Number</p>
      <p className="absolute font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] left-[20px] not-italic text-[#3b3d4b] text-[22px] top-[44px] tracking-[-0.44px] whitespace-nowrap">8085472417</p>
      <div className="-translate-x-1/2 absolute bg-gradient-to-l from-[#235697] from-[1.194%] h-[44px] left-[calc(50%+87.5px)] rounded-[8px] to-[#114280] top-[86px] w-[160px]">
        <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex items-center justify-center px-[128px] py-[16px] relative size-full">
            <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.4] not-italic relative shrink-0 text-[14px] text-center text-white tracking-[-0.28px] whitespace-nowrap">Share Info</p>
          </div>
        </div>
      </div>
      <Frame />
    </div>
  );
}

function Frame11() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[8px] items-center left-1/2 top-[303px]">
      <div className="h-0 relative shrink-0 w-[82px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 82 1">
            <line id="Line 252" stroke="var(--stroke-0, #E3E3E3)" x2="82" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#e3e3e3] text-[12px] text-center tracking-[-0.24px] whitespace-nowrap">OR</p>
      <div className="h-0 relative shrink-0 w-[82px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 82 1">
            <line id="Line 252" stroke="var(--stroke-0, #E3E3E3)" x2="82" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">Top-up using Card</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Add money directly from your bank card</p>
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

function CreditCard() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[20px] top-1/2" data-name="CreditCard">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="CreditCard">
          <path d={svgPaths.p28270980} fill="url(#paint0_linear_1_6557)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6557" x1="18.541" x2="1.25" y1="3.75" y2="3.75">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[50px] size-[40px] top-1/2">
      <CreditCard />
    </div>
  );
}

function Frame9() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[327px] w-[375px]">
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame12 />
      <CaretRight1 />
      <Frame2 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[72px] not-italic top-[11.5px] whitespace-nowrap">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] relative shrink-0 text-[#3b3d4b] text-[14px] text-center tracking-[-0.28px]">Top-up using Card</p>
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.5] relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px]">Add money directly from your bank card</p>
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

function CreditCard1() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[20px] top-1/2" data-name="CreditCard">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="CreditCard">
          <path d={svgPaths.p28270980} fill="url(#paint0_linear_1_6557)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6557" x1="18.541" x2="1.25" y1="3.75" y2="3.75">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[50px] size-[40px] top-1/2">
      <CreditCard1 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="absolute bg-white h-[60px] left-0 overflow-clip top-[391px] w-[375px]">
      <div className="absolute bottom-0 h-0 left-[16px] w-[343px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 343 1">
            <line id="Line 251" stroke="var(--stroke-0, #F3F3F3)" x2="343" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame14 />
      <CaretRight2 />
      <Frame3 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[744px] left-1/2 overflow-clip rounded-tl-[16px] rounded-tr-[16px] top-[68px] w-[375px]">
      <Frame6 />
      <Frame7 />
      <Frame8 />
      <Frame11 />
      <Frame9 />
      <Frame13 />
    </div>
  );
}

export default function AddMoney() {
  return (
    <div className="bg-white relative size-full" data-name="Add Money 1">
      <div className="absolute bottom-0 h-[34px] left-0 w-[375px]" data-name="Home Indicator">
        <div className="-translate-x-1/2 absolute bg-black bottom-[8px] h-[5px] left-[calc(50%+0.5px)] rounded-[100px] w-[134px]" data-name="Home Indicator" />
      </div>
      <Frame4 />
      <Frame5 />
    </div>
  );
}