import svgPaths from "./svg-i5mky3xghy";

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
    <div className="-translate-y-1/2 absolute left-[20px] size-[20px] top-[calc(50%+0.5px)]" data-name="CaretLeft">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="CaretLeft">
          <path d={svgPaths.p10be5e00} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute border-[#f3f3f3] border-b border-solid h-[50px] left-0 overflow-clip top-0 w-[375px]">
      <p className="-translate-x-1/2 absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-1/2 not-italic overflow-hidden text-[#3a3c4c] text-[15px] text-center text-ellipsis top-[calc(50%-11px)] tracking-[-0.3px] w-[209px] whitespace-nowrap">Send to Bank Account</p>
      <CaretLeft />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[20px] text-white tracking-[-0.4px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[10px] relative row-1 w-[17px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 2">
            <line id="Line 3" stroke="var(--stroke-0, white)" strokeWidth="2" x2="17" y1="1" y2="1" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[14px] relative row-1 w-[17px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 2">
            <line id="Line 4" stroke="var(--stroke-0, white)" strokeWidth="2" x2="17" y1="1" y2="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[2px] items-center justify-end left-[calc(50%-45px)] top-[45px]">
      <Group />
      <p className="font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[28px] text-center text-white tracking-[-0.56px] whitespace-nowrap">20,000,00.00</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="-translate-x-1/2 absolute contents left-[calc(50%-17.5px)] top-[24px]">
      <p className="absolute font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.5] left-[calc(50%-147.5px)] not-italic text-[11px] text-[rgba(255,255,255,0.8)] top-[24px] tracking-[-0.22px] w-[260px]">Total Balance</p>
      <p className="absolute font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.5] left-[calc(50%-147.5px)] not-italic text-[9px] text-[rgba(255,255,255,0.8)] top-[83px] tracking-[-0.18px] w-[260px]">Last updated 2 mins ago.</p>
      <Frame1 />
    </div>
  );
}

function Component31A86295F41B41E39A667Ec7Cd8C03C() {
  return (
    <div className="absolute inset-[16.58%_6.06%_60.28%_85.58%]" data-name="31a86295-f41b-41e3-9a66-7ec7cd8c03c7">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="31a86295-f41b-41e3-9a66-7ec7cd8c03c7">
          <path d={svgPaths.p15857380} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p2ed6b280} fill="var(--fill-0, white)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="-translate-x-1/2 absolute bg-[#235697] h-[121px] left-1/2 overflow-clip rounded-[8px] top-[74px] w-[335px]">
      <div className="absolute left-[157.95px] size-[290.139px] top-[-13.44px]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 290.139 290.139">
          <circle cx="145.07" cy="145.07" fill="var(--fill-0, black)" id="Ellipse 655" opacity="0.1" r="145.07" />
        </svg>
      </div>
      <Group1 />
      <Component31A86295F41B41E39A667Ec7Cd8C03C />
    </div>
  );
}

function CaretRight() {
  return (
    <div className="relative size-[18px]" data-name="CaretRight">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="CaretRight">
          <path d={svgPaths.p34f11a00} fill="var(--fill-0, #7D7C93)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute inset-[31.12%_9.03%_31.12%_8.49%]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.748 4.50012">
        <g id="Group 2157">
          <path d={svgPaths.p3940ac80} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p3343df00} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p9ea1fc0} fill="var(--fill-0, white)" id="Vector_3" />
          <path d={svgPaths.p3cd9af00} fill="var(--fill-0, white)" id="Vector_4" />
          <path d={svgPaths.pcdafc00} fill="var(--fill-0, white)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function UbaUnitedBankForAfrica() {
  return (
    <div className="absolute h-[11.917px] left-[1.67px] overflow-clip top-[4px] w-[16.667px]" data-name="UBA-United-Bank-for-Africa 1">
      <Group2 />
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute bg-[#e21001] left-0 overflow-clip rounded-[166.667px] size-[20px] top-[21px]">
      <UbaUnitedBankForAfrica />
    </div>
  );
}

function Frame6() {
  return (
    <div className="-translate-x-1/2 absolute border-[#e5e5e5] border-b border-solid h-[48px] left-1/2 overflow-clip top-[287px] w-[335px]">
      <p className="absolute font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] left-0 not-italic text-[#7d7c93] text-[12px] top-0 tracking-[-0.24px] whitespace-nowrap">Bank</p>
      <div className="-translate-y-1/2 absolute flex items-center justify-center right-0 size-[18px] top-[calc(50%+0.5px)]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "22" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <CaretRight />
        </div>
      </div>
      <Frame />
      <p className="absolute font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] left-[28px] not-italic text-[#313131] text-[15px] top-[22px] tracking-[-0.3px] whitespace-nowrap">United Bank of Africa</p>
    </div>
  );
}

function MagnifyingGlass() {
  return (
    <div className="-translate-y-1/2 absolute right-0 size-[18px] top-[calc(50%+0.5px)]" data-name="MagnifyingGlass">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="MagnifyingGlass">
          <path d={svgPaths.p3e98a000} fill="var(--fill-0, #7D7C93)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[744px] left-1/2 overflow-clip rounded-[16px] top-[68px] w-[375px]">
      <Frame3 />
      <Frame5 />
      <Frame6 />
      <div className="-translate-x-1/2 absolute bg-gradient-to-l content-stretch flex from-[#235697] from-[1.194%] h-[53px] items-center justify-center left-1/2 overflow-clip px-[128px] py-[16px] rounded-[8px] to-[#114280] top-[435px] w-[335px]">
        <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.4] not-italic relative shrink-0 text-[15px] text-center text-white tracking-[-0.3px] whitespace-nowrap">Continue</p>
      </div>
      <div className="absolute border-[#e5e5e5] border-b border-solid font-['Basis_Grotesque_Pro:Regular',sans-serif] h-[48px] leading-[1.2] left-[20px] not-italic overflow-clip top-[219px] w-[335px] whitespace-nowrap" data-name="Email Address">
        <p className="absolute left-0 text-[#7d7c93] text-[12px] top-0 tracking-[-0.24px]">Account Number</p>
        <p className="absolute left-0 text-[#373f46] text-[15px] top-[calc(50%-1.5px)] tracking-[-0.3px]">2122444522</p>
      </div>
      <div className="-translate-x-1/2 absolute bg-white border-[#e5e5e5] border-b border-solid h-[48px] left-1/2 overflow-clip top-[355px] w-[335px]" data-name="Account Information">
        <p className="absolute font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] left-0 not-italic text-[#7d7c93] text-[12px] top-0 tracking-[-0.24px] whitespace-nowrap">Beneficiary’s name</p>
        <MagnifyingGlass />
        <p className="absolute font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] left-0 not-italic text-[#373f46] text-[15px] top-[calc(50%-1.5px)] tracking-[-0.3px] whitespace-nowrap">VICTOR JIMOH</p>
      </div>
    </div>
  );
}

export default function SendMoney() {
  return (
    <div className="bg-white relative size-full" data-name="Send Money 3">
      <div className="absolute bottom-0 h-[34px] left-0 w-[375px]" data-name="Home Indicator">
        <div className="-translate-x-1/2 absolute bg-black bottom-[8px] h-[5px] left-[calc(50%+0.5px)] rounded-[100px] w-[134px]" data-name="Home Indicator" />
      </div>
      <Frame4 />
      <Frame2 />
    </div>
  );
}