-- Task 8 presales worklog backfill template
-- Scope: PS-01 and PS-02 only
-- Environment: formal database aligned to BUILD_ID QtQJ7V2Xl8fJVkIswY6tx
-- IMPORTANT:
-- 1. Current acceptance path assumes test-data defaults are allowed for PS-01 and PS-02.
-- 2. Use this file only for records 1 and 2 on project 1.
-- 3. Keep execution inside a transaction until before/after checks pass.

begin;

-- ---------------------------------------------------------------------------
-- 1. Before-state validation
-- ---------------------------------------------------------------------------

select
  r.id,
  r.project_id,
  p.project_name,
  u.real_name as staff_name,
  pst.type_name as service_type_name,
  r.service_date,
  r.duration_hours,
  r.total_work_hours,
  r.participant_count,
  r.description,
  r.status
from bus_project_presales_record r
left join bus_project p on p.id = r.project_id
left join sys_user u on u.id = r.staff_id
left join sys_presales_service_type pst on pst.id = r.service_type_id
where r.id in (1, 2)
order by r.id;

-- ---------------------------------------------------------------------------
-- 2. Fill business-confirmed values here before execution
-- ---------------------------------------------------------------------------

create temporary table _task8_presales_seed (
  id integer primary key,
  service_date timestamp,
  duration_hours numeric(10, 2),
  total_work_hours numeric(10, 2),
  participant_count integer,
  description text,
  status varchar(50)
) on commit drop;

insert into _task8_presales_seed (
  id,
  service_date,
  duration_hours,
  total_work_hours,
  participant_count,
  description,
  status
)
values
  (1, timestamp '2026-03-29 09:00:00', 8.00, 8.00, 1, null, null),
  (2, timestamp '2026-03-29 14:00:00', 10.00, 10.00, 1, null, null);

select * from _task8_presales_seed order by id;

-- ---------------------------------------------------------------------------
-- 3. Update PS-01 and PS-02 only when required values are fully provided
-- ---------------------------------------------------------------------------

with validated_seed as (
  select *
  from _task8_presales_seed
  where service_date is not null
    and duration_hours is not null
)
update bus_project_presales_record r
set
  service_date = s.service_date,
  duration_hours = s.duration_hours,
  total_work_hours = coalesce(s.total_work_hours, s.duration_hours),
  participant_count = coalesce(s.participant_count, 1),
  description = coalesce(s.description, r.description),
  status = coalesce(s.status, r.status)
from validated_seed s
where r.id = s.id;

-- Safety check: this should return 0 before you commit.
select count(*) as incomplete_seed_rows
from _task8_presales_seed
where service_date is null
   or duration_hours is null;

-- ---------------------------------------------------------------------------
-- 4. After-state validation
-- ---------------------------------------------------------------------------

select
  r.id,
  r.project_id,
  p.project_name,
  u.real_name as staff_name,
  pst.type_name as service_type_name,
  r.service_date,
  r.duration_hours,
  r.total_work_hours,
  r.participant_count,
  r.description,
  r.status
from bus_project_presales_record r
left join bus_project p on p.id = r.project_id
left join sys_user u on u.id = r.staff_id
left join sys_presales_service_type pst on pst.id = r.service_type_id
where r.id in (1, 2)
order by r.id;

select
  count(*) as missing_worklog_count
from bus_project_presales_record r
where r.deleted_at is null
  and (r.duration_hours is null or r.total_work_hours is null);

-- If checks pass, commit manually.
-- commit;

-- If checks fail, rollback manually.
-- rollback;