# This is free software, licensed under the Apache License, Version 2.0 .

include $(TOPDIR)/rules.mk

PKG_VERSION:=1.0.3
PKG_RELEASE:=4
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Airoha AN7581 Maintainer
TITLE:=LuCI Airoha AN7581 NPU Status

LUCI_TITLE:=LuCI Airoha AN7581 NPU Status
LUCI_DESCRIPTION:=Displays real-time Airoha AN7581 NPU status including NPU utilization, \
	CPU frequency and load, frame engine statistics, and supports CPU overclocking.
LUCI_DEPENDS:=+luci-base +kmod-br-netfilter @TARGET_airoha

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
