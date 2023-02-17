import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateJobComponent } from './duplicate-job.component';

describe('DuplicateJobComponent', () => {
  let component: DuplicateJobComponent;
  let fixture: ComponentFixture<DuplicateJobComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DuplicateJobComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DuplicateJobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
