
import React from "react";

export const NavigationHeader = () => {
  return (
    <header className="bg-[rgba(252,252,252,1)] shadow-[0px_5px_15px_rgba(112,144,176,0.1)] flex w-full items-stretch gap-5 flex-wrap justify-between px-[19px] py-[11px]">
      <img
        loading="lazy"
        srcSet="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/a83b2003003fb2a64362bf8c369adff95f6a127e9fe6bf4617eb2ef96658c00c?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/a83b2003003fb2a64362bf8c369adff95f6a127e9fe6bf4617eb2ef96658c00c?placeholderIfAbsent=true&width=200 200w, https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/a83b2003003fb2a64362bf8c369adff95f6a127e9fe6bf4617eb2ef96658c00c?placeholderIfAbsent=true&width=400 400w, https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/a83b2003003fb2a64362bf8c369adff95f6a127e9fe6bf4617eb2ef96658c00c?placeholderIfAbsent=true&width=800 800w"
        className="aspect-[2.87] object-contain w-[120px] shrink-0"
        alt="Company Logo"
      />
      <div className="flex items-center gap-[21px] my-auto">
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/4d00173e4fb8240021c0a318645f525fd5cc21b5f4dbd26957747e5acdf6b087?placeholderIfAbsent=true"
          className="aspect-[1] object-contain w-4 self-stretch shrink-0 my-auto"
          alt="Notification Icon"
        />
        <div className="self-stretch w-0.5 shrink-0 h-[22px] my-auto border-[rgba(218,223,234,1)] border-solid border-2" />
        <div className="self-stretch flex items-stretch gap-3">
          <div className="flex flex-col items-stretch my-auto">
            <div className="text-[rgba(25,25,25,1)] text-xs font-bold">
              Marc Abshire
            </div>
            <div className="text-neutral-600 text-[10px] font-medium text-right">
              User
            </div>
          </div>
          <img
            loading="lazy"
            srcSet="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/bfe138b2c64949f9bda226e13abf05ca1b57e57a63befc19dd64aa364bb86f20?placeholderIfAbsent=true&width=100 100w"
            className="aspect-[1] object-contain w-8 shrink-0 rounded-[0px_0px_0px_0px]"
            alt="User Avatar"
          />
        </div>
      </div>
    </header>
  );
};
