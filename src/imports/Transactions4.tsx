import svgPaths from "./svg-ahnohum2b2";

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

function Frame18() {
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

function MagnifyingGlass() {
  return (
    <div className="-translate-y-1/2 absolute right-[50px] size-[20px] top-[calc(50%+0.5px)]" data-name="MagnifyingGlass">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="MagnifyingGlass">
          <path d={svgPaths.p1783a7f0} fill="var(--fill-0, #3C3F49)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function FunnelSimple() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="FunnelSimple">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="FunnelSimple">
          <path d={svgPaths.p31344280} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame35() {
  return (
    <div className="-translate-y-1/2 absolute bg-gradient-to-l from-[#235697] from-[1.194%] left-[335px] overflow-clip rounded-[50px] size-[20px] to-[#114280] top-[calc(50%+0.5px)]">
      <FunnelSimple />
    </div>
  );
}

function Frame20() {
  return (
    <div className="absolute border-[#f3f3f3] border-b border-solid h-[50px] left-0 overflow-clip top-0 w-[375px]">
      <CaretLeft />
      <p className="-translate-x-1/2 absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-1/2 not-italic overflow-hidden text-[#3a3c4c] text-[15px] text-center text-ellipsis top-[calc(50%-11px)] tracking-[-0.3px] w-[209px] whitespace-nowrap">Transactions</p>
      <MagnifyingGlass />
      <Frame35 />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">5,000.00</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">Add Money - Bank Card</p>
      <Frame4 />
    </div>
  );
}

function Frame22() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame17 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">3:40 PM</p>
    </div>
  );
}

function CreditCard() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[25px] top-1/2" data-name="CreditCard">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
        <g id="CreditCard">
          <path d={svgPaths.p230cb00} fill="url(#paint0_linear_1_6634)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6634" x1="23.1763" x2="1.5625" y1="4.6875" y2="4.6875">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame23() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <CreditCard />
    </div>
  );
}

function Frame13() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[103px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame22 />
      <Frame23 />
    </div>
  );
}

function Group1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group1 />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">2,000.00</p>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">Umaru Abubakar</p>
      <Frame5 />
    </div>
  );
}

function Frame24() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame25 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">9:33 AM</p>
    </div>
  );
}

function Xmlid() {
  return (
    <div className="absolute inset-[33.33%_-0.01%_33.78%_1.88%]" data-name="XMLID_1_">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28.2632 9.47241">
        <g id="XMLID_1_">
          <path d={svgPaths.p323d3b00} fill="var(--fill-0, white)" id="XMLID_2_" />
          <path d={svgPaths.p1f126780} fill="var(--fill-0, white)" id="XMLID_3_" />
          <path d={svgPaths.p3640b700} fill="var(--fill-0, white)" id="XMLID_4_" />
          <path d={svgPaths.p13a3bb00} fill="var(--fill-0, white)" id="XMLID_5_" />
          <path d={svgPaths.p2043fcf0} fill="var(--fill-0, white)" id="XMLID_6_" />
          <path d={svgPaths.p2da1b2f0} fill="var(--fill-0, white)" id="XMLID_9_" />
          <path d={svgPaths.p3b463872} fill="var(--fill-0, white)" id="XMLID_12_" />
        </g>
      </svg>
    </div>
  );
}

function Ecobank() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 overflow-clip size-[28.8px] top-1/2" data-name="Ecobank-01 1">
      <Xmlid />
    </div>
  );
}

function Frame1() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#00597d] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <Ecobank />
    </div>
  );
}

function Frame10() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[166px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame24 />
      <Frame1 />
    </div>
  );
}

function Group2() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group2 />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">1,234,600.00</p>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">Adeola Balogun</p>
      <Frame6 />
    </div>
  );
}

function Frame26() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame27 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">7:50 PM</p>
    </div>
  );
}

function Group6() {
  return (
    <div className="absolute inset-[31.12%_9%_31.12%_8.5%]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27.7212 9.07229">
        <g id="Group 2157">
          <path d={svgPaths.p3a629500} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p1febde00} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p237dd000} fill="var(--fill-0, white)" id="Vector_3" />
          <path d={svgPaths.pd6e8300} fill="var(--fill-0, white)" id="Vector_4" />
          <path d={svgPaths.p16bd1100} fill="var(--fill-0, white)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

function UbaUnitedBankForAfrica() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[24.024px] left-1/2 overflow-clip top-[calc(50%+0.01px)] w-[33.6px]" data-name="UBA-United-Bank-for-Africa 1">
      <Group6 />
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#e21001] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <UbaUnitedBankForAfrica />
    </div>
  );
}

function Frame11() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[273px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame26 />
      <Frame />
    </div>
  );
}

function Group3() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group3 />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">20,000.00</p>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">Add Money - Bank Card</p>
      <Frame7 />
    </div>
  );
}

function Frame28() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame29 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">2:00 PM</p>
    </div>
  );
}

function CreditCard1() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[25px] top-1/2" data-name="CreditCard">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
        <g id="CreditCard">
          <path d={svgPaths.p230cb00} fill="url(#paint0_linear_1_6634)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6634" x1="23.1763" x2="1.5625" y1="4.6875" y2="4.6875">
            <stop stopColor="#235697" />
            <stop offset="1" stopColor="#114280" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Frame30() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#f1f5f9] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <CreditCard1 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[506px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame28 />
      <Frame30 />
    </div>
  );
}

function Group4() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group4 />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">2,000.00</p>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">Ifeoma Okonkwo</p>
      <Frame8 />
    </div>
  );
}

function Frame31() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame32 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">6:00 PM</p>
    </div>
  );
}

function FirstBank() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[33.6px] top-1/2" data-name="first_bank 1">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33.6 33.6">
        <g id="first_bank 1">
          <g id="Vector" />
          <path d={svgPaths.p22498200} fill="var(--fill-0, #E4B935)" id="Vector_2" />
          <path d={svgPaths.p12cac80} fill="var(--fill-0, #DFAC0F)" id="Vector_3" />
          <path d={svgPaths.p1e8cb900} fill="var(--fill-0, white)" id="Vector_4" />
          <path d={svgPaths.p34564680} fill="var(--fill-0, white)" id="Vector_5" />
          <path d={svgPaths.p7e5d900} fill="var(--fill-0, white)" id="Vector_6" />
          <path d={svgPaths.p1287f700} fill="var(--fill-0, white)" id="Vector_7" />
          <path d={svgPaths.p103a4380} fill="var(--fill-0, white)" id="Vector_8" />
          <path d={svgPaths.pe099700} fill="var(--fill-0, white)" id="Vector_9" />
          <path d={svgPaths.p3fb92080} fill="var(--fill-0, white)" id="Vector_10" />
          <path d={svgPaths.p3e525e80} fill="var(--fill-0, white)" id="Vector_11" />
          <path d={svgPaths.p33baa200} fill="var(--fill-0, white)" id="Vector_12" />
          <path d={svgPaths.p398d4600} fill="var(--fill-0, white)" id="Vector_13" />
          <path d={svgPaths.p1c6445d0} fill="var(--fill-0, #162D4C)" id="Vector_14" />
          <path d={svgPaths.pc1084f0} fill="var(--fill-0, #162D4C)" id="Vector_15" />
          <path d={svgPaths.p2c272300} fill="var(--fill-0, #162D4C)" id="Vector_16" />
          <path d={svgPaths.p3e68f480} fill="var(--fill-0, #162D4C)" id="Vector_17" />
          <path d={svgPaths.pf29fc20} fill="var(--fill-0, #162D4C)" id="Vector_18" />
          <path d={svgPaths.p2b04b380} fill="var(--fill-0, #DCAA10)" id="Vector_19" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#162d4c] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <FirstBank />
    </div>
  );
}

function Frame12() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[336px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame31 />
      <Frame2 />
    </div>
  );
}

function Group5() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="col-1 font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] ml-px mt-0 not-italic relative row-1 text-[#235697] text-[13px] tracking-[-0.26px] whitespace-nowrap">N</p>
      <div className="col-1 h-0 ml-0 mt-[6.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="col-1 h-0 ml-0 mt-[9.5px] relative row-1 w-[11px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 1">
            <line id="Line 246" stroke="var(--stroke-0, #235697)" x2="11" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[2px] items-center justify-center relative shrink-0">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[13px] text-center text-ellipsis tracking-[-0.26px] whitespace-nowrap">+</p>
      <Group5 />
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic overflow-hidden relative shrink-0 text-[#235697] text-[12px] text-ellipsis text-right tracking-[-0.24px] whitespace-nowrap">2,000,000.00</p>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[287px]">
      <p className="font-['Basis_Grotesque_Pro:Medium',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#3b3d4b] text-[14px] tracking-[-0.28px] whitespace-nowrap">{`Coca Cola Industries `}</p>
      <Frame9 />
    </div>
  );
}

function Frame33() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3px] items-start left-[68px] top-[12.5px]">
      <Frame34 />
      <p className="font-['Basis_Grotesque_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#7d7c93] text-[12px] tracking-[-0.24px] whitespace-nowrap">4:19 PM</p>
    </div>
  );
}

function HeritageBank() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[31.2px] top-1/2" data-name="heritage_bank 1">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 31.2 31.2">
        <g id="heritage_bank 1">
          <path d={svgPaths.p158d6700} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p36e32480} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p17569f2} fill="var(--fill-0, white)" id="Vector_3" />
          <path d={svgPaths.p141f0280} fill="var(--fill-0, white)" id="Vector_4" />
          <path d={svgPaths.p15a97e80} fill="var(--fill-0, white)" id="Vector_5" />
          <path d={svgPaths.p1f1e2500} fill="var(--fill-0, white)" id="Vector_6" />
          <path d={svgPaths.p3c31b900} fill="var(--fill-0, white)" id="Vector_7" />
          <path d={svgPaths.p798f80} fill="var(--fill-0, white)" id="Vector_8" />
          <path d={svgPaths.p25e65400} fill="var(--fill-0, white)" id="Vector_9" />
          <path d={svgPaths.p2ee78080} fill="var(--fill-0, white)" id="Vector_10" />
          <path d={svgPaths.p3cc46400} fill="var(--fill-0, white)" id="Vector_11" />
          <path d={svgPaths.p3673e500} fill="var(--fill-0, white)" id="Vector_12" />
          <path d={svgPaths.p1b686f00} fill="var(--fill-0, white)" id="Vector_13" />
          <path d={svgPaths.p2861ee80} fill="var(--fill-0, white)" id="Vector_14" />
          <path d={svgPaths.p3951c700} fill="var(--fill-0, white)" id="Vector_15" />
          <path d={svgPaths.p20546400} fill="var(--fill-0, white)" id="Vector_16" />
          <path d={svgPaths.p1abba0f1} fill="var(--fill-0, white)" id="Vector_17" />
          <path d={svgPaths.pf9c38f0} fill="var(--fill-0, white)" id="Vector_18" />
        </g>
      </svg>
    </div>
  );
}

function Frame16() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#68ac48] left-[20px] overflow-clip rounded-[300px] size-[36px] top-1/2">
      <HeritageBank />
    </div>
  );
}

function Frame14() {
  return (
    <div className="absolute h-[59px] left-0 overflow-clip top-[443px] w-[375px]">
      <div className="absolute bottom-0 h-0 right-0 w-[355px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 355 1">
            <line id="Line 249" stroke="var(--stroke-0, #F3F3F3)" x2="355" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame33 />
      <Frame16 />
    </div>
  );
}

function DownloadSimple() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="DownloadSimple">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="DownloadSimple">
          <path d={svgPaths.p222fca80} fill="url(#paint0_linear_1_6622)" id="Vector" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_6622" x1="15.5888" x2="2.25" y1="2.25" y2="2.25">
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
    <div className="-translate-x-1/2 absolute bg-white h-[32px] left-[calc(50%+107.5px)] rounded-[8px] top-[24px] w-[120px]">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[10px] items-center justify-center px-[128px] py-[16px] relative size-full">
          <DownloadSimple />
          <p className="bg-clip-text bg-gradient-to-l font-['Basis_Grotesque_Pro:Medium',sans-serif] from-[#235697] from-[1.194%] leading-[1.4] not-italic relative shrink-0 text-[15px] text-[transparent] text-center to-[#114280] tracking-[-0.3px] whitespace-nowrap">Statement</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#235697] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Frame21() {
  return (
    <div className="absolute bg-white h-[576px] left-0 overflow-clip top-[50px] w-[375px]">
      <p className="absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.2] left-[20px] not-italic text-[#3b3d4b] text-[18px] top-[29px] tracking-[-0.36px] whitespace-nowrap">Incoming Transactions</p>
      <p className="absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-[20px] not-italic text-[#3a3c4c] text-[12px] top-[75px] tracking-[0.24px] whitespace-nowrap">TODAY</p>
      <Frame13 />
      <Frame10 />
      <p className="absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-[20px] not-italic text-[#3a3c4c] text-[12px] top-[245px] tracking-[0.24px] whitespace-nowrap">TUESDAY 23 MAY 2023</p>
      <p className="absolute font-['Basis_Grotesque_Pro:Bold',sans-serif] leading-[1.5] left-[20px] not-italic text-[#3a3c4c] text-[12px] top-[415px] tracking-[0.24px] whitespace-nowrap">MONDAY 22 MAY 2023</p>
      <Frame11 />
      <Frame15 />
      <Frame12 />
      <Frame14 />
      <Frame3 />
    </div>
  );
}

function Frame19() {
  return (
    <div className="-translate-x-1/2 absolute bg-white h-[636px] left-1/2 overflow-clip rounded-tl-[16px] rounded-tr-[16px] top-[68px] w-[375px]">
      <Frame20 />
      <Frame21 />
    </div>
  );
}

export default function Transactions() {
  return (
    <div className="bg-white relative size-full" data-name="Transactions 4">
      <div className="absolute bottom-0 h-[34px] left-0 w-[375px]" data-name="Home Indicator">
        <div className="-translate-x-1/2 absolute bg-black bottom-[8px] h-[5px] left-[calc(50%+0.5px)] rounded-[100px] w-[134px]" data-name="Home Indicator" />
      </div>
      <Frame18 />
      <Frame19 />
    </div>
  );
}