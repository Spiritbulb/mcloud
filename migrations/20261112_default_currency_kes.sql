-- New stores price in Kenyan shillings. The column default was USD, so every store created
-- without an explicit currency started in dollars. newStoreRow() (@mcloud/merchant) now sets
-- KES itself; this default covers any other insert path.
-- Existing stores keep their currency: changing it would relabel their prices without converting
-- them. Merchants can switch in General settings.
alter table public.stores alter column currency set default 'KES';
