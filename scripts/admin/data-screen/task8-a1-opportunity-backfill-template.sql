-- Task 8 A1 region first-batch backfill template
-- Scope: BS-01 to BS-05 + pre/post validation
-- Environment: formal database aligned to BUILD_ID QtQJ7V2Xl8fJVkIswY6tx
-- IMPORTANT:
-- 1. Current acceptance path assumes test-data defaults are allowed for BS-01 to BS-05.
-- 2. Run inside a controlled session and keep the transaction open until checks pass.
-- 3. Do not use this file to delete test data 728/731; those rows need a separate governance decision.

begin;

-- ---------------------------------------------------------------------------
-- 1. Before-state validation
-- ---------------------------------------------------------------------------

select
  p.id,
  p.project_code,
  p.project_name,
  p.region,
  p.project_stage,
  p.estimated_amount,
  po.id as opportunity_row_id,
  po.opportunity_stage,
  po.expected_amount,
  po.win_probability,
  po.expected_close_date
from bus_project p
left join bus_project_opportunity po on po.project_id = p.id
where p.id in (301, 312, 168, 169, 185)
order by p.id;

-- Optional snapshot of the two stability rows to confirm they stay out of this batch.
select
  p.id,
  p.project_code,
  p.project_name,
  p.region,
  p.project_stage,
  p.estimated_amount
from bus_project p
where p.id in (728, 731)
order by p.id;

-- ---------------------------------------------------------------------------
-- 2. Fill business-confirmed values here before execution
-- ---------------------------------------------------------------------------

create temporary table _task8_a1_seed (
  project_id integer primary key,
  opportunity_stage varchar(50),
  expected_amount numeric(15, 2),
  win_probability integer,
  expected_close_date date,
  next_action text,
  next_action_date date
) on commit drop;

insert into _task8_a1_seed (
  project_id,
  opportunity_stage,
  expected_amount,
  win_probability,
  expected_close_date,
  next_action,
  next_action_date
)
values
  (301, 'qualified', 70000000.00, 70, date '2026-05-31', '测试数据回填：推进 qualified 阶段商机', date '2026-04-15'),
  (312, 'qualified', 36000000.00, 70, date '2026-06-05', '测试数据回填：推进 qualified 阶段商机', date '2026-04-16'),
  (168, 'qualified', 21168780.00, 70, date '2026-06-10', '测试数据回填：推进 qualified 阶段商机', date '2026-04-17'),
  (169, 'qualified', 20000000.00, 70, date '2026-06-15', '测试数据回填：推进 qualified 阶段商机', date '2026-04-18'),
  (185, 'qualified', 20000000.00, 70, date '2026-06-20', '测试数据回填：推进 qualified 阶段商机', date '2026-04-19');

select * from _task8_a1_seed order by project_id;

-- ---------------------------------------------------------------------------
-- 3. Insert missing opportunity child rows for BS-01 to BS-05 only
-- ---------------------------------------------------------------------------

with validated_seed as (
  select *
  from _task8_a1_seed
  where win_probability is not null
    and expected_close_date is not null
)
insert into bus_project_opportunity (
  project_id,
  opportunity_stage,
  expected_amount,
  win_probability,
  expected_close_date,
  next_action,
  next_action_date,
  created_at,
  updated_at
)
select
  s.project_id,
  s.opportunity_stage,
  s.expected_amount,
  s.win_probability,
  s.expected_close_date,
  s.next_action,
  s.next_action_date,
  now(),
  now()
from validated_seed s
where not exists (
  select 1
  from bus_project_opportunity existing
  where existing.project_id = s.project_id
);

-- Safety check: this should return 0 before you commit.
select count(*) as incomplete_seed_rows
from _task8_a1_seed
where win_probability is null
   or expected_close_date is null;

-- ---------------------------------------------------------------------------
-- 4. After-state validation
-- ---------------------------------------------------------------------------

select
  p.id,
  p.project_code,
  p.project_name,
  p.region,
  po.id as opportunity_row_id,
  po.opportunity_stage,
  po.expected_amount,
  po.win_probability,
  po.expected_close_date,
  po.next_action,
  po.updated_at
from bus_project p
join bus_project_opportunity po on po.project_id = p.id
where p.id in (301, 312, 168, 169, 185)
order by p.id;

-- Count should start moving down after this batch.
select
  count(*) as missing_opportunity_count,
  round(sum(coalesce(p.estimated_amount, '0')::numeric), 2) as missing_opportunity_amount
from bus_project p
left join bus_project_opportunity po on po.project_id = p.id
where p.deleted_at is null
  and p.project_stage = 'opportunity'
  and p.bid_result is distinct from 'won'
  and po.id is null;

-- If checks pass, commit manually.
-- commit;

-- If checks fail, rollback manually.
-- rollback;